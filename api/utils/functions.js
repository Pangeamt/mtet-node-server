const saveFile = async (file, path) => {
  return new Promise((resolve, reject) => {
    try {
      file.mv(path, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  saveFile
};
