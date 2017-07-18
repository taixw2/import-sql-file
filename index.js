var fs = require('fs')
var mysql = require('mysql')
var Promise = require('promise').Promise

/**
 * @param {any} filePath sql文件路径
 * @param {any} sqlConfig mysql的配置
 */
function ImportSql(filePath, sqlConfig) {
  var _this = this
  _this.querys = []
  _this.sqlConfig = sqlConfig
  

  _this.import(filePath)
  .then(function(fileData) {
    return _this.splitFileSQL(fileData)
  })
  .then(function(queue) {
    _this.querys = queue
    return _this.createConnect()
  })
  .then(function(pool) {
     return new Promise(function(resolve, reject) {
        _this.execSqlQueue(_this.querys, pool, function(err, statue) {
          if (err) reject(err)
          resolve(true)
        })
     })
  })
}


ImportSql.prototype = {
  constructor: ImportSql,

  /**
   * 加载文件
   * 
   */
  import(path) {
    return new Promise(function (resolve, reject) {
      fs.readFile(path, function (err, data) {
        if (err) {
          reject(err)
        }
        resolve(data.toString())
      }) 
    })
  }

  /**
   * 拆分sql语句
   */
  splitFileSQL(sqlFileData) {
    return Promise.resolve(
      .replace(/(?:\r\n|\r|\n)/g, ' ').trim() // 删除换行
      .replace(/\/\*.*?\*\//g, ' ').trim() // 删除注释
      .split(';') // 拆分每行
      .map(function(v) {
        return v.replace(/--.*-+/g, '  ').trim()  // 删除单行注释
      })
      .filter(function(v) { return !!v })
    )
  }

  execSqlQueue (queue, pool, callback) {
    var _this = this
    if (!queue.length) {
      callback(void 0, true)
      return
    }

    pool.getConnection(function(connErr, conn) {
      if (connErr) {
        conn.release()
        callback(err)
        return
      }

      var query = queue.shift() 
      conn.query(query, function(queryErr) {
        callback(queryErr, query)
        _this.execSqlQueue(queue, pool, callback)
      })
    })

  }

  /**
   * 创建一个mysql连接
   * @returns 
   */
  createConnect() {
    return new Promise((resolve, reject) => {
      const pool = mysql.createPool(this.sqlConfig)

      pool.getConnection(err => err ? reject(err) : resolve(pool))
    })
  }


}



exports.ImportSql = ImportSql



