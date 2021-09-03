const httpStatus = require("http-status");
const Path = require("path");
const moment = require("moment");
const fs = require("fs");
const map = require("async/map");
var convert = require("xml-js");
const xmlReader = require("read-xml");
const randomstring = require("randomstring");

const APIError = require("./../utils/APIError");
const Sequelize = require("sequelize");
const db = require("../../models");
const Op = Sequelize.Op;
const Project = db.Project;
const Tuv = db.Tuv;
const Task = db.Task;
const Evaluation = db.Evaluation;
const TuvProject = db.TuvProject;

const deleteFolderRecursive = async (path) => {
  try {
    if (fs.existsSync(path)) {
      fs.readdirSync(path).forEach((file, index) => {
        const curPath = Path.join(path, file);
        if (fs.lstatSync(curPath).isDirectory()) {
          // recurse
          deleteFolderRecursive(curPath);
        } else {
          // delete file
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(path);
    }
  } catch (error) {
    console.log(error);
  }
};

const fillArray = async (array, nameFile) => {
  try {
    await array.mv(nameFile);
    const data = fs.readFileSync(nameFile, "UTF-8");
    const lines = data.split(/\r?\n/);
    const narray = [];
    for (let i = 0; i < lines.length; i++) {
      const aux = lines[i].split(" ").join("");
      if (aux) narray.push(lines[i]);
    }

    return narray;
  } catch (error) {
    return error;
  }
};

const getLang = (fileName) => {
  let tmp = fileName.split(".");
  let lang = null;
  if (tmp.length !== 3) {
    throw new APIError({
      message: `Filename ${fileName}.txt has an incorrect format`,
      status: httpStatus.BAD_REQUEST,
    });
  } else {
    lang = tmp[1];
  }
  return lang;
};

const asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
};

const createTuvsAndTuvProjects = async (doc, tuv) => {
  if (tuv.text && tuv.text.length) {
    const aux = tuv.text.split(" ").join("");
    if (aux && aux.length) {
      const docTuv = await Tuv.create(tuv);
      const tp = {
        tuvId: docTuv.id,
        projectId: doc.id,
      };
      await TuvProject.create(tp);
    }
  }
};

const getEvaluations = async (doc) => {
  const tasks = [];
  doc.Tasks.forEach((item2) => {
    tasks.push({ TaskId: item2.id });
  });
  const complete = await Evaluation.count({
    where: {
      complete: true,
      [Op.or]: tasks,
    },
  });
  const total = await Evaluation.count({
    where: {
      [Op.or]: tasks,
    },
  });

  return { complete, total };
};

exports.load = async (req, res, next, id) => {
  try {
    const doc = await Project.findByPk(id);
    req.locals = { project: doc };
    return next();
  } catch (error) {
    return next(error);
  }
};

exports.get = (req, res) =>
  res.json(
    req.locals.project.get({
      plain: true,
    })
  );

exports.create = async (req, res, next) => {
  try {
    const body = req.body;
    const file = req.files["files[]"];

    const folderName = moment().valueOf();
    const pathFolder = Path.resolve(
      __dirname,
      `./../../uploads/${folderName}/`
    );
    fs.mkdirSync(pathFolder);

    file.mv(`${pathFolder}/${file.name}.tmx`, function (err) {
      if (err) return res.status(500).send(err);

      // pass a buffer or a path to a xml file
      xmlReader.readXML(
        fs.readFileSync(`${pathFolder}/${file.name}.tmx`),
        async (err, data) => {
          deleteFolderRecursive(pathFolder);
          if (err) {
            return next(err);
          }
          try {
            var xml = JSON.parse(convert.xml2json(data.content));
            const tus = xml.elements[1].elements[1].elements;
            let src, tgt;
            const tuvs = [];

            tus.map((item, j) => {
              item.elements.map((item1) => {
                if (
                  item1 &&
                  item1.elements &&
                  item1.elements.length &&
                  item1.elements[0].elements &&
                  item1.elements[0].elements.length &&
                  item1.elements[1] &&
                  item1.elements[1].elements &&
                  item1.elements[1].elements.length
                ) {
                  if (item1.elements[0].elements[0].text === "Source")
                    src = item1.attributes.lang.toLowerCase();
                  if (item1.elements[0].elements[0].text === "Reference")
                    tgt = item1.attributes.lang.toLowerCase();
                  const aux = {
                    tuId: item.attributes.tuid,
                    language: item1.attributes.lang.toLowerCase(),
                    origin: item1.elements[0].elements[0].text,
                    text: item1.elements[1].elements[0].text,
                  };
                  tuvs.push(aux);
                }
              });
            });

            body.source = src;
            body.target = tgt;

            const doc = await Project.create(body);

            await asyncForEach(tuvs, async (tuv) => {
              await createTuvsAndTuvProjects(doc, tuv);
            });

            const docTransformed = doc.get({
              plain: true,
            });
            res.status(httpStatus.CREATED);
            return res.json({ doc: docTransformed });
          } catch (error) {
            if (error.message === "Validation error") {
              return next(error);
            }
            const apiError = new APIError({
              message: error
                ? `XML File Error. ${error.message}.`
                : "XML File Error!",
              status: httpStatus.BAD_REQUEST,
              stack: error ? error.stack : undefined,
            });
            return next(apiError);
          }
        }
      );
    });
  } catch (error) {
    return next(error);
  }
};

exports.createFromFiles = async (req, res, next) => {
  try {
    const body = req.body;
    const sources = req.files["sources[]"];
    const references = req.files["references[]"];
    const targets = req.files["targets[]"];
    const folderName = moment().valueOf();
    const pathFolder = Path.resolve(
      __dirname,
      `./../../uploads/${folderName}/`
    );

    const tgt = [];

    fs.mkdirSync(pathFolder);
    const srcLines = await fillArray(sources, `${pathFolder}/${sources.name}`);

    const src = {
      lines: srcLines,
      lang: getLang(sources.name),
    };
    const refLines = await fillArray(
      references,
      `${pathFolder}/${references.name}`
    );
    if (refLines.length !== srcLines.length) {
      throw new APIError({
        message: "Source and reference files have different number of lines",
        status: httpStatus.BAD_REQUEST,
      });
    }

    const ref = {
      lines: refLines,
      lang: getLang(references.name),
    };
    if (Array.isArray(targets)) {
      for (const target of targets) {
        const aux = await fillArray(target, `${pathFolder}/${target.name}`);
        if (aux.length !== srcLines.length) {
          throw new APIError({
            message: `The file ${target.name}, contains an incorrect number of lines`,
            status: httpStatus.BAD_REQUEST,
          });
        }

        tgt.push({
          lines: aux,
          lang: getLang(target.name),
          name: target.name.split(".")[0],
        });
      }
    } else {
      const target = targets;
      const aux = await fillArray(target, `${pathFolder}/${target.name}`);
      if (aux.length !== srcLines.length) {
        throw new APIError({
          message: `The file ${target.name}, contains an incorrect number of lines`,
          status: httpStatus.BAD_REQUEST,
        });
      }

      tgt.push({
        lines: aux,
        lang: getLang(target.name),
        name: target.name.split(".")[0],
      });
    }

    const tuvs = [];
    for (let i = 0; i < srcLines.length; i++) {
      const tuId = randomstring.generate(7);
      const sText = src.lines[i];
      const rText = ref.lines[i];

      if (sText && sText.length) {
        tuvs.push({
          tuId: tuId,
          language: src.lang.toLowerCase(),
          origin: "Source",
          text: sText,
        });

        if (rText && rText.length) {
          tuvs.push({
            tuId: tuId,
            language: ref.lang.toLowerCase(),
            origin: "Reference",
            text: rText,
          });

          tgt.forEach((item) => {
            const tText = item.lines[i];
            if (rText && rText.length) {
              tuvs.push({
                tuId: tuId,
                language: item.lang.toLowerCase(),
                origin: item.name,
                text: tText,
              });
            }
          });
        }
      }
    }

    body.source = src.lang;
    body.target = ref.lang;

    const doc = await Project.create(body);

    await asyncForEach(tuvs, async (tuv) => {
      await createTuvsAndTuvProjects(doc, tuv);
    });

    const docTransformed = doc.get({
      plain: true,
    });
    res.status(httpStatus.CREATED);
    return res.json({ doc: docTransformed });
  } catch (error) {
    return next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const doc = Object.assign(req.locals.project, req.body);
    await doc.save();

    const docTransformed = doc.get({
      plain: true,
    });
    return res.json({ doc: docTransformed });
  } catch (err) {
    return next(error);
  }
};

exports.list = async (req, res, next) => {
  try {
    const {
      page = 1,
      results = 10,
      sortField = null,
      sortOrder = null,
      ...filters
    } = req.query;

    const options = {
      page: parseInt(page),
      paginate: parseInt(results), // Default 25
      order: [["createdAt", "DESC"]],
      where: {
        remove: false,
      },
      include: [
        {
          model: Tuv,
          as: "tuvs",
        },
        {
          model: Task,
          attributes: ["id"],
        },
      ],
    };

    if (sortField && sortOrder) {
      let sort = null;
      if (sortOrder === "ascend") {
        sort = "ASC";
      } else if (sortOrder === "descend") {
        sort = "DESC";
      }

      options["order"] = Sequelize.literal(`${sortField} ${sort}`);
    }

    if (filters) {
      const aux = Object.keys(filters);
      const where = {
        remove: false,
      };
      if (aux.length) {
        aux.map((item) => {
          const or = [];
          filters[item].map((elem) => {
            or.push({ [Op.like]: `%${elem}%` });
          });

          where[item] = {
            [Op.or]: or,
          };
        });
      }
      options["where"] = where;
    }

    const { docs, pages, total } = await db.Project.paginate(options);

    let transformedDocs = docs.map((doc) =>
      doc.get({
        plain: true,
      })
    );

    transformedDocs = transformedDocs.map((element) => {
      if (element.tuvs) {
        let tus = 0;
        let obj = {};
        element.tuvs.forEach((element) => {
          if (!obj[element.tuId]) {
            tus++;
            obj[element.tuId] = true;
          }
        });
        element.nTuvs = element.tuvs ? element.tuvs.length : 0;
        element.nTus = tus;
        return element;
      }
    });

    await asyncForEach(transformedDocs, async (doc) => {
      const { complete, total } = await getEvaluations(doc);
      doc["complete"] = complete;
      doc["total"] = total;
    });

    res.json({ docs: transformedDocs, pages, total });
  } catch (error) {
    return next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { project } = req.locals;

    await project.destroy();

    return res.status(httpStatus.NO_CONTENT).end();
  } catch (error) {
    return next(error);
  }
};

exports.clone = async (req, res, next) => {
  try {
    const { project } = req.locals;
    const { name, source, target, type } = req.body;

    const p = {
      name,
      source,
      target,
      type,
    };
    const doc = await Project.create(p);

    const tuvs = await TuvProject.findAll({
      where: {
        projectId: project.id,
      },
    });

    await asyncForEach(tuvs, async (tuv) => {
      const tp = {
        tuvId: tuv.tuvId,
        projectId: doc.id,
      };
      await TuvProject.create(tp);
    });

    return res.status(httpStatus.NO_CONTENT).end();
  } catch (error) {
    return next(error);
  }
};
