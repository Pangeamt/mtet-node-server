const httpStatus = require("http-status");
const map = require("async/map");
const APIError = require("../utils/APIError");

const db = require("../../models");
const Project = db.Project;
const Tuv = db.Tuv;
const Task = db.Task;
const Evaluation = db.Evaluation;
const User = db.User;

const fluency = {
  0: "Fluent",
  1: "Minor problems",
  2: "Major problems",
  3: "Critical/Mistranslation"
}

const accuracy = {
  0: "Accurate",
  1: "Minor problems",
  2: "Major problems",
  3: "Critical/Mistranslation"
}


const mqm = {
  0: "No Error",
  1: "Minor",
  2: "Major",
  3: "Critical"
}

const mqmSuv = {
  0: "Under-translation",
  1: "Untranslated text",
  2: "Mistranslation",
  3: "Addition",
  3: "Omission",
  3: "Other"
}

const asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
};

const getEvaluations = async (doc) => {
  const evaluations = await Evaluation.findAll({
    where: {
      TaskId: doc.id,
      UserId: doc.UserId,
    },
    include: [
      {
        model: User,
      },
    ],
  });
  let complete = 0;
  evaluations.forEach((element) => {
    if (element.complete) {
      complete++;
    }
  });
  doc.complete = complete;
  doc.total = evaluations.length;
  let user = null;

  if (evaluations.length && evaluations[0].User) {
    user = {
      id: evaluations[0].User.id,
      nickname: evaluations[0].User.nickname,
      email: evaluations[0].User.email,
    };
  }

  doc.user = user;
  return doc;
};

const createTasks = async (task, projectDoc) => {
  const { showSourceText, showReferenceText, tuvs, tus: tusAux } = task;
  const docTask = await Task.create({
    showSourceText,
    showReferenceText,
    tuvs,
    tus: tusAux.length,
  });

  projectDoc.addTask(docTask.id);
  const tus = tusAux;
  const resEvs = [];
  await asyncForEach(tus, async (tu) => {
    const results = [];
    await asyncForEach(tu, async (tuv) => {
      const dTuv = await Tuv.findByPk(tuv);
      results.push(dTuv);
    });
    const evs = [];
    const temp = { tuId: "", reference: "", source: "" };
    results.forEach((element) => {
      const aux = {
        from: "",
        text: "",
      };
      temp.tuId = element.tuId;
      if (element.origin === "Source") {
        temp.source = element.text;
      } else if (element.origin === "Reference") {
        temp.reference = element.text;
      } else {
        aux["text"] = element.text;
        aux["from"] = element.origin;

        aux["tuId"] = temp.tuId;
        aux["reference"] = temp.reference;
        aux["source"] = temp.source;
        evs.push(aux);
      }
    });
    resEvs.push(evs);
  });
  let evs = [];
  resEvs.forEach((element) => {
    element.forEach((element1) => {
      evs.push(element1);
    });
  });

  await new Promise(function (resolve, reject) {
    // do a thing, possibly async, then
    map(
      evs,
      (ev, cb) => {
        Evaluation.create(ev)
          .then((data) => {
            docTask.addEvaluation(data.id);
            cb(null, data);
          })
          .catch((err) => {
            cb(err, null);
          });
      },
      (err, results) => {
        if (err) return reject(err);
        return resolve(results);
      }
    );
  });
};

const getTasks = async (task) => {
  const doc = await Task.findByPk(parseInt(task.TaskId));
  if (doc.ProjectId) {
    const { id, name, source, target, type } = await Project.findByPk(
      doc.ProjectId
    );
    const transformDoc = doc.get({
      plain: true,
    });
    transformDoc["project"] = {
      id,
      name,
      source,
      target,
      type,
    };

    const aux = Object.assign(transformDoc, task);
    delete aux.tuvs;
    return aux;
  }
  return null;
};

exports.load = async (req, res, next, id) => {
  try {
    const doc = await Task.findByPk(id);
    req.locals = { task: doc };
    return next();
  } catch (error) {
    return next(error);
  }
};

exports.loadEvaluation = async (req, res, next, id) => {
  try {
    const doc = await Evaluation.findByPk(id);
    req.locals = { evaluation: doc };
    return next();
  } catch (error) {
    return next(error);
  }
};

exports.get = async (req, res, next) => {
  try {
    const { task } = req.locals;

    if (task && task.active) {
      const _task = task.get({
        plain: true,
      });

      let query = {
        where: {
          TaskId: task.id,
          UserId: req.user.id,
        },
        order: [["createdAt", "DESC"]],
      };

      const project = await Project.findByPk(_task.ProjectId);
      _task.project = {
        name: project.name,
        segments: project.segments,
        type: project.type || 0,
      };
      const docs = await Evaluation.findAll(query);

      const transformedDocs = docs.map((doc) =>
        doc.get({
          plain: true,
        })
      );

      const obj = {};
      transformedDocs.forEach((element) => {
        if (obj[element.tuId]) {
          delete element.from;
          delete element.reference;
          delete element.source;
          obj[element.tuId].tuvs.push(element);
        } else {
          obj[element.tuId] = {
            tuvs: [],
            tuId: element.tuId,
            reference: element.reference,
            referenceLang: project.target,
            source: element.source,
            sourceLang: project.source,
          };
          delete element.from;
          delete element.reference;
          delete element.source;
          obj[element.tuId].tuvs.push(element);
        }
      });
      const array = [];
      Object.keys(obj).forEach((element) => {
        array.push(obj[element]);
      });

      res.json({ docs: array, task: _task });
    } else {
      throw new APIError({
        message: "Unauthorized",
        status: httpStatus.UNAUTHORIZED,
      });
    }
  } catch (error) {
    return next(error);
  }
};

exports.getJson = async (req, res, next) => {
  try {
    const { task } = req.locals;

    if (task && task.active) {
      const _task = task.get({
        plain: true,
      });

      let query = {
        where: {
          TaskId: task.id,
          // UserId: req.user.id,
        },
        order: [["createdAt", "DESC"]],
      };

      const project = await Project.findByPk(_task.ProjectId);
      _task.project = {
        name: project.name,
        segments: project.segments,
        type: project.type || 0,
      };
      const docs = await Evaluation.findAll(query);

      const transformedDocs = docs.map((doc) =>
        doc.get({
          plain: true,
        })
      );

      const obj = {};
      transformedDocs.forEach((element) => {
        const aux = { id: element.id, tuId: element.tuId }
        if (project.type === "zero-to-one-hundred") {
          console.log(project.type)
          aux['zero-to-one-hundred'] = element.value
          aux['text'] = element.text
          aux['system'] = element.from
          aux['comment'] = element.comment
        } else if (project.type === "fluency") {
          aux['fluency'] = element.value
          aux['fluencyText'] = fluency[element.value]
          aux['text'] = element.text
          aux['system'] = element.from
          aux['comment'] = element.comment

        } else if (project.type === "accuracy") {
          aux['accuracy'] = element.value
          aux['accuracyText'] = accuracy[element.value]
          aux['text'] = element.text
          aux['system'] = element.from
          aux['comment'] = element.comment
        } else {
          aux['accuracy'] = { value: JSON.parse(element['accuracy']).value, subValue: JSON.parse(element['accuracy']).value !== '0' ? JSON.parse(element['accuracy']).subValue : null }
          aux['accuracyText'] = { value: mqm[JSON.parse(element['accuracy']).value], subValue: JSON.parse(element['accuracy']).value !== '0' ? mqmSuv[JSON.parse(element['accuracy']).subValue] : null }

          aux['fluency'] = { value: JSON.parse(element['fluency']).value, subValue: JSON.parse(element['fluency']).value !== '0' ? JSON.parse(element['fluency']).subValue : null }
          aux['fluencyText'] = { value: mqm[JSON.parse(element['fluency']).value], subValue: JSON.parse(element['fluency']).value !== '0' ? mqmSuv[JSON.parse(element['fluency']).subValue] : null }

          aux['localeConvention'] = { value: JSON.parse(element['localeConvention']).value, subValue: JSON.parse(element['localeConvention']).value !== '0' ? JSON.parse(element['localeConvention']).subValue : null }
          aux['localeConventionText'] = { value: mqm[JSON.parse(element['localeConvention']).value], subValue: JSON.parse(element['localeConvention']).value !== '0' ? mqmSuv[JSON.parse(element['localeConvention']).subValue] : null }

          aux['terminology'] = { value: JSON.parse(element['terminology']).value, subValue: JSON.parse(element['terminology']).value !== '0' ? JSON.parse(element['terminology']).subValue : null }
          aux['terminologyText'] = { value: mqm[JSON.parse(element['terminology']).value], subValue: JSON.parse(element['terminology']).value !== '0' ? mqmSuv[JSON.parse(element['terminology']).subValue] : null }

          aux['style'] = { value: JSON.parse(element['style']).value, subValue: JSON.parse(element['style']).value !== '0' ? JSON.parse(element['style']).subValue : null }
          aux['styleText'] = { value: mqm[JSON.parse(element['style']).value], subValue: JSON.parse(element['style']).value !== '0' ? mqmSuv[JSON.parse(element['style']).subValue] : null }

          aux['translation'] = element.translation
          aux['text'] = element.text
          aux['system'] = element.from
          aux['comment'] = element.comment
        }

        if (obj[element.tuId]) {
          delete element.from;
          delete element.reference;
          delete element.source;
          obj[element.tuId].evaluations.push(aux);
        } else {


          obj[element.tuId] = {
            evaluations: [],
            tuId: element.tuId,
            reference: element.reference,
            referenceLang: project.target,
            source: element.source,
            sourceLang: project.source,
          };
          delete element.from;
          delete element.reference;
          delete element.source;
          obj[element.tuId]['evaluations'].push(aux);
        }
      });
      const array = [];
      Object.keys(obj).forEach((element) => {
        array.push(obj[element]);
      });

      // res.json({ docs: array, task: _task });
      res.header("Content-Type", 'application/json');
      res.send(JSON.stringify({ docs: array, task: _task }));
    } else {
      throw new APIError({
        message: "Unauthorized",
        status: httpStatus.UNAUTHORIZED,
      });
    }
  } catch (error) {
    return next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { tasks, project } = req.body;

    const projectDoc = await Project.findByPk(project);

    await asyncForEach(tasks, async (task) => {
      await createTasks(task, projectDoc);
    });

    res.status(httpStatus.CREATED);
    return res.send("success");
  } catch (error) {
    return next(error);
  }
};

exports.active = async (req, res, next) => {
  try {
    const { finish } = req.body;
    const { task } = req.locals;

    if (finish !== undefined && finish) {
      task.complete = finish;
    } else {
      task.active = !task.active;
    }

    await task.save();

    const docTransformed = task.get({
      plain: true,
    });
    return res.json({ doc: docTransformed });
  } catch (err) {
    return next(error);
  }
};

exports.restart = async (req, res, next) => {
  try {
    const { task } = req.locals;

    task.active = false;
    await task.save();

    await Evaluation.update(
      {
        UserId: null,
      },
      {
        where: {
          TaskId: task.id,
        },
      }
    );

    return res.status(httpStatus.NO_CONTENT).end();
  } catch (err) {
    return next(error);
  }
};

exports.assign = async (req, res, next) => {
  try {
    const { task } = req.locals;
    const { evaluator } = req.body;

    const doc = await User.findByPk(evaluator);

    if (doc) {
      const evaluations = await Evaluation.findAll({
        where: {
          TaskId: task.id,
          complete: false,
        },
      });

      task.active = true;
      task.UserId = doc.id;
      await task.save();

      for (let i = 0; i < evaluations.length; i++) {
        evaluations[i].UserId = doc.id;
        await evaluations[i].save();
      }

      return res.status(httpStatus.NO_CONTENT).end();
    }
  } catch (err) {
    return next(error);
  }
};

exports.list = async (req, res, next) => {
  try {
    const {
      project,
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
        ProjectId: project,
      },
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
        ProjectId: project,
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

    const { docs, pages, total } = await db.Task.paginate(options);

    const transformedDocs = docs.map((doc) =>
      doc.get({
        plain: true,
      })
    );

    await asyncForEach(transformedDocs, async (doc) => {
      await getEvaluations(doc);
    });

    res.json({ docs: transformedDocs, pages, total });
  } catch (error) {
    return next(error);
  }
};

exports.evaluator = async (req, res, next) => {
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
        UserId: req.user.id,
      },
      include: [
        {
          model: Evaluation,
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

    if (filters && Object.keys(filters).length) {
      const aux = Object.keys(filters);
      const where = {
        UserId: req.user.id,
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

    const { docs, pages, total } = await db.Task.paginate(options);

    const transformedDocs = docs.map((doc) =>
      doc.get({
        plain: true,
      })
    );

    const tasks = [];
    transformedDocs.forEach((task) => {
      let complete = 0;
      let aux = {
        TaskId: task.id,
        tuvs: task.Evaluations,
      };
      task.Evaluations.forEach((element1) => {
        if (element1.complete) complete++;
      });
      aux.completes = complete;
      aux.total = task.Evaluations.length;
      tasks.push(aux);
    });

    const tmp = [];
    await asyncForEach(tasks, async (task) => {
      if (task) {
        const aux = await getTasks(task);
        tmp.push(aux);
      }
    });

    const documents = tmp.filter((item) => item && item.UserId === req.user.id);
    res.status(httpStatus.OK);
    res.json(documents);
  } catch (error) {
    console.log("\n");
    console.log("\x1b[33m%s\x1b[0m", "***************MODELS****************");
    console.log("\x1b[33m%s\x1b[0m", JSON.stringify(error));
    console.log("\x1b[33m%s\x1b[0m", "*************************************");
    console.log("\n");
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { task } = req.locals;

    await db.Evaluation.destroy({
      where: {
        TaskId: task.id,
      },
    });

    await task.destroy();

    return res.status(httpStatus.NO_CONTENT).end();
  } catch (error) {
    return next(error);
  }
};

exports.setValue = async (req, res, next) => {
  try {
    const { values, task } = req.body;
    let aux = await Task.findByPk(task);
    if (aux.active) {
      map(
        values,
        (value, cb) => {
          Evaluation.findByPk(value.id)
            .then(async (doc) => {
              doc.value = value.value;
              doc.comment = value.comment;
              doc.translation = value.translation;
              doc.accuracy = value.accuracy;
              doc.fluency = value.fluency;
              doc.terminology = value.terminology;
              doc.style = value.style;
              doc.localeConvention = value.localeConvention;
              doc.complete = true;
              await doc.save();
              cb(null, true);
            })
            .catch((err) => cb(err, null));
        },
        (err) => {
          if (err) {
            return next(err);
          } else {
            return res.status(httpStatus.NO_CONTENT).end();
          }
        }
      );
    } else {
      throw new APIError({
        message: "Unauthorized",
        status: httpStatus.UNAUTHORIZED,
      });
    }
  } catch (error) {
    return next(error);
  }
};
