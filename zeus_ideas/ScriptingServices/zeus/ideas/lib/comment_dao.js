/* globals $ */
/* eslint-env node, dirigible */
(function(){
"use strict";

var database = require("db/database");

var datasource = database.getDatasource();

var persistentProperties = {
	mandatory: ["id", "boardId"],
	optional: ["text", "user", "publishTime", "lastModifiedTime", "replyToCommentId"]
};

var log = require("zeus/ideas/logging/logger").logger;
log.ctx = "ZEUS Comment DAO";

// Parse JSON entity into SQL and insert in db. Returns the new record id.
exports.insert = function(item) {
	
	log.info('Inserting ZEUS_COMMENT entity');
	
	if(item === undefined || item === null){
		throw new Error('Illegal argument: entity is ' + item);
	}
	
	for(var i = 0; i< persistentProperties.mandatory.length; i++){
		var propName = persistentProperties.mandatory[i];
		if(propName==='id')
			continue;//Skip validaiton check for id. It's epxected to be null on insert.
		var propValue = item[propName];
		if(propValue === undefined || propValue === null){
			throw new Error('Illegal ' + propName + ' attribute value: ' + propValue);
		}
	}
	
    var connection = datasource.getConnection();
    try {
        var sql = "INSERT INTO ZEUS_COMMENT (ZEUSC_ID, ZEUSC_ZEUSB_ID, ZEUSC_REPLY_TO_ZEUSC_ID, ZEUSC_COMMENT_TEXT, ZEUSC_USER, ZEUSC_PUBLISH_TIME, ZEUSC_LASTMODIFIED_TIME)";
        sql += " VALUES (?,?,?,?,?,?,?)";

        var statement = connection.prepareStatement(sql);
        item = createSQLEntity(item);
        
        item.id = datasource.getSequence('ZEUS_COMMENT_ZEUSC_ID').next();

        var j = 0;
        statement.setInt(++j, item.id);
        statement.setInt(++j, item.boardId);
        statement.setInt(++j, item.replyToCommentId);
        statement.setString(++j, item.text);
        
        //TODO: move to frontend svc
        var user = require("net/http/user");
        item.user = user.getName();
        
        statement.setString(++j, item.user);
        
        /* TODO: */
        item.publishTime = Date.now();
        statement.setLong(++j, item.publishTime);
        item.lastModifiedTime = item.publishTime;
        statement.setLong(++j, item.lastModifiedTime);

        statement.executeUpdate();
        
        log.info('ZEUS_COMMENT[' + item.id + '] entity inserted');
        
        return item.id;
        
    } catch(e) {
		e.errContext = sql;
		throw e;
    } finally {
        connection.close();
    }
};

// Reads a single entity by id, parsed into JSON object 
exports.find = function(id, expanded) {

	log.info('Finding ZEUS_COMMENT entity with id[' + id + ']');

    var connection = datasource.getConnection();
    try {
        var item;
        var sql = "SELECT * FROM ZEUS_COMMENT LEFT JOIN USR_USER AS u ON ZEUSC_USER = u.USRU_UNAME WHERE " + exports.pkToSQL();
        var statement = connection.prepareStatement(sql);
        statement.setInt(1, id);
        
        var resultSet = statement.executeQuery();
        if (resultSet.next()) {
            item = createEntity(resultSet);
            if(item){
            	log.info('ZEUS_COMMENT entity with id[' + id + '] found');
            	if(expanded){
            		item.comments = exports.findComments(item.boardId, expanded);
            	} 
            }           	
		} else {
        	log.info('ZEUS_COMMENT entity with id[' + id + '] found');
       	}
        
        return item;

    } catch(e) {
		e.errContext = sql;
		throw e;
    } finally {
        connection.close();
    }
};

exports.findComments = function(boardId, expanded) {

	log.info('Finding ZEUS_COMMENT entities in reply to ZEUS_BOARD entity with id[' + boardId + ']');

    var connection = datasource.getConnection();
    try {
        var items = [];
        var sql = "SELECT * FROM ZEUS_COMMENT LEFT JOIN USR_USER AS u ON ZEUSC_USER = u.USRU_UNAME WHERE ZEUSC_ZEUSB_ID=? AND ZEUSC_REPLY_TO_ZEUSC_ID IS NULL";
        var statement = connection.prepareStatement(sql);
        statement.setInt(1, boardId);
        
        var resultSet = statement.executeQuery();
		while (resultSet.next()) {
			var item = createEntity(resultSet);
            items.push(item);
            if(expanded){
            	item.replies = exports.findReplies(boardId, item.id);
            }
        }
        
        log.info('' + items.length +' ZEUS_COMMENT entities in reply to ZEUS_BOARD entity with id['+boardId+'] found');
        
        return items;

    } catch(e) {
		e.errContext = sql;
		throw e;
    } finally {
        connection.close();
    }
};

exports.findReplies = function(boardId, commentId) {

	log.info('Finding ZEUS_COMMENT entities in reply to ZEUS_COMMENT entity with id[' + commentId + '] for ZEUS_BOARD['+boardId+'] entity');

    var connection = datasource.getConnection();
    try {
        var items = [];
        var sql = "SELECT * FROM ZEUS_COMMENT LEFT JOIN USR_USER AS u ON ZEUSC_USER = u.USRU_UNAME WHERE ZEUSC_ZEUSB_ID=? AND ZEUSC_REPLY_TO_ZEUSC_ID=?";
        var statement = connection.prepareStatement(sql);
        statement.setInt(1, boardId);
        statement.setInt(2, commentId);
        
        var resultSet = statement.executeQuery();
		while (resultSet.next()) {
            items.push(createEntity(resultSet));
        }
        
        log.info('' + items.length +'  ZEUS_COMMENT entities in reply to ZEUS_COMMENT entity with id[' + commentId + '] for ZEUS_BOARD['+boardId+'] entity');
        
        return items;

    } catch(e) {
		e.errContext = sql;
		throw e;
    } finally {
        connection.close();
    }
};

exports.findDiscussionPosts = function(boardId, flat) {

	log.info('Finding ZEUS_COMMENT entities for ZEUS_BOARD['+boardId+'] entity');

    var connection = datasource.getConnection();
    try {
        var items = [];
        var sql = "SELECT * FROM ZEUS_COMMENT LEFT JOIN USR_USER AS u ON ZEUSC_USER = u.USRU_UNAME WHERE ZEUSC_ZEUSB_ID=? ORDER BY ";
        
        if(!flat){
        	sql += "ZEUSC_REPLY_TO_ZEUSC_ID,";
        }
        
        sql += "ZEUSC_PUBLISH_TIME";
                
        var statement = connection.prepareStatement(sql);
        statement.setInt(1, boardId);
        
        var resultSet = statement.executeQuery();
		while (resultSet.next()) {
			var item = createEntity(resultSet);
			if(!flat){
				if(item.replyToCommentId !== undefined){
					items.map(function(_it){
						if(item.replyToCommentId === _it.id){
							if(!_it.replies)
								_it.replies = [];
							_it.replies.push(item);
						}
						return _it;
					});
				} else {
					items.push(item);
				}
			} else {
				items.push(item);
			}
           	item.replies = exports.findReplies(boardId, item.id);
        }
        
        log.info('' + items.length +' ZEUS_COMMENT entities in reply to ZEUS_BOARD['+boardId+'] entity');
        
        return items;

    } catch(e) {
		e.errContext = sql;
		throw e;
    } finally {
        connection.close();
    }
};


// Read all entities, parse and return them as an array of JSON objets
exports.list = function(boardId, limit, offset, sort, order, expanded) {

	log.info('Listing ZEUS_COMMENT entity collection for ZEUS_BOARD[' + boardId + '] with list operators: limit['+limit+'], offset['+offset+'], sort['+sort+'], order['+order+'], expanded['+expanded+']');

    var connection = datasource.getConnection();
    try {
        var items = [];
        var sql = "SELECT ";
        if ((limit !== null && limit !== undefined) && (offset !== null && offset !== undefined)) {
            sql += " " + datasource.getPaging().genTopAndStart(limit, offset);
        }
        sql += " * FROM ZEUS_COMMENT";
        sql += " LEFT JOIN USR_USER AS u ON ZEUSC_USER = u.USRU_UNAME";
        if(boardId !== null && boardId !== undefined){
        	sql += " WHERE ZEUSC_ZEUSB_ID=" + boardId;
        }
        if (sort !== null && sort !== undefined) {
            sql += " ORDER BY " + sort;
        }
        if ((sort !== null && sort !== undefined) && (order !== null && order !== undefined)) {
            sql += " " + order;
        }
        if ((limit !== null && limit !== undefined) && (offset !== null && offset !== undefined)) {
            sql += " " + datasource.getPaging().genLimitAndOffset(limit, offset);
        }

        var statement = connection.prepareStatement(sql);
        var resultSet = statement.executeQuery();
        while (resultSet.next()) {
        	var item = createEntity(resultSet);
        	if(item.replyToCommentId === undefined){
        		item.replies = exports.findReplies(item.boardId, item.id);
        		items.push(item);
    		}
        }
        
        log.info('' + items.length +' ZEUS_COMMENT entities found');
        
        return items;
        
    }  catch(e) {
		e.errContext = sql;
		throw e;
    } finally {
        connection.close();
    }
};

//create entity as JSON object from ResultSet current Row
function createEntity(resultSet) {
    var entity = {};
	entity.id = resultSet.getInt("ZEUSC_ID");
	entity.text = resultSet.getString("ZEUSC_COMMENT_TEXT");
	entity.boardId = resultSet.getString("ZEUSC_ZEUSB_ID");
    entity.user = resultSet.getString("USRU_UNAME");
    entity.pic = resultSet.getString("USRU_PIC");
    entity.replyToCommentId = resultSet.getString("ZEUSC_REPLY_TO_ZEUSC_ID");
    if(entity.replyToCommentId < 0){
    	entity.replyToCommentId = undefined;
    }
    
  	entity.publishTime = resultSet.getLong("ZEUSC_PUBLISH_TIME");
    entity.publishTime = new Date(entity.publishTime).toISOString();
    
    entity.lastModifiedTime = resultSet.getLong("ZEUSC_LASTMODIFIED_TIME");    
    if(entity.lastModifiedTime!==null)
    	entity.lastModifiedTime = new Date(entity.lastModifiedTime).toISOString();    
    
    var user = require("net/http/user");
    entity.editable = entity.user === user.getName();    
    log.info("Transformation from DB JSON object finished");
    return entity;
}

//Prepare a JSON object for insert into DB
function createSQLEntity(item) {
	var persistentItem = {};
	for(var i=0;i<persistentProperties.mandatory.length;i++){
		persistentItem[persistentProperties.mandatory[i]] = item[persistentProperties.mandatory[i]];
	}
	for(var i=0;i<persistentProperties.optional.length;i++){
		if(item[persistentProperties.optional[i]] !== undefined){
			persistentItem[persistentProperties.optional[i]] = item[persistentProperties.optional[i]];
		} else {
			persistentItem[persistentProperties.optional[i]] = null;
		}
	}
	if(persistentItem.replyToCommentId === null){
    	persistentItem.replyToCommentId = -1;
    }
	log.info("Transformation to DB JSON object finished");
	return persistentItem;
}

// update entity from a JSON object. Returns the id of the updated entity.
exports.update = function(item) {

	log.info('Updating ZEUS_COMMENT[' + item!==undefined?item.id:item + '] entity');

	if(item === undefined || item === null){
		throw new Error('Illegal argument: entity is ' + item);
	}
	
	for(var i = 0; i< persistentProperties.mandatory.length; i++){
		var propName = persistentProperties.mandatory[i];
		var propValue = item[propName];
		if(propValue === undefined || propValue === null){
			throw new Error('Illegal value for property ' + propName + '[' + propValue +'] in ZEUS_COMMENT for update ' + item);
		}
	}

    var connection = datasource.getConnection();
    try {
        var sql = "UPDATE ZEUS_COMMENT SET ZEUSC_COMMENT_TEXT = ?, ZEUSC_LASTMODIFIED_TIME = ?";
        sql += " WHERE ZEUSC_ID = ?";
        
        var statement = connection.prepareStatement(sql);
        item = createSQLEntity(item);

        var i = 0;
        statement.setString(++i, item.text);
        statement.setLong(++i, Date.now());
        var id = item.id;
        statement.setInt(++i, id);
        statement.executeUpdate();
        
        log.info('ZEUS_COMMENT[' + id + '] entity updated');
        
        return this;

    } catch(e) {
		e.errContext = sql;
		throw e;
    } finally {
        connection.close();
    }
};

// delete entity by id. Returns the id of the deleted entity.
exports.remove = function(id) {

	log.info('Deleting ZEUS_COMMENT[' + id + '] entity');
	
	if(id === undefined || id === null){
		throw new Error('Illegal argument: id[' + id + ']');
	}	

    var connection = datasource.getConnection();
    try {
    	var sql = "DELETE FROM ZEUS_COMMENT WHERE " + exports.pkToSQL() + " OR ZEUSC_REPLY_TO_ZEUSC_ID = ?";
        var statement = connection.prepareStatement(sql);
        statement.setInt(1, id);
        statement.setInt(2, id);
        statement.executeUpdate();
        
        log.info('ZEUS_COMMENT[' + id + '] entity and dependent DIS_COMMENT entities deleted');        
        
        return id;
        
    }  catch(e) {
		e.errContext = sql;
		throw e;
    } finally {
        connection.close();
    }
};


exports.count = function() {

	log.info('Counting ZEUS_COMMENT entities');

    var count = 0;
    var connection = datasource.getConnection();
    try {
    	var sql = 'SELECT COUNT(*) FROM ZEUS_COMMENT';
        var statement = connection.prepareStatement(sql);
        var rs = statement.executeQuery();
        if (rs.next()) {
            count = rs.getInt(1);
        }
    }  catch(e) {
		e.errContext = sql;
		throw e;
    } finally {
        connection.close();
    }
    
    log.info('' + count + ' ZEUS_COMMENT entities counted');         
    
    return count;
};

exports.getPrimaryKeys = function() {
    var result = [];
    var i = 0;
    result[i++] = 'ZEUSC_ID';
    if (result === 0) {
        throw new Error("There is no primary key");
    } else if(result.length > 1) {
        throw new Error("More than one Primary Key is not supported.");
    }
    return result;
};

exports.getPrimaryKey = function() {
	return exports.getPrimaryKeys()[0].toLowerCase();
};

exports.pkToSQL = function() {
    var pks = exports.getPrimaryKeys();
    return pks[0] + " = ?";
};

})();
