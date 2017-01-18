/* globals $ */
/* eslint-env node, dirigible */
(function(){
"use strict";

var database = require("db/database");
var commentsLib = require("zeus/ideas/lib/comment_dao");
var boardVotes = require("zeus/ideas/lib/board_votes");
var userLib = require("net/http/user");

var datasource = database.getDatasource();

var itemsEntitySetName = "comments";

var persistentProperties = {
	mandatory: ["id"],
	optional: ["shortText", "description", "publishTime", "lastModifiedTime", "status", "user"]
};

var log = require("zeus/ideas/logging/logger").logger;
log.ctx = "ZEUS Board DAO";

// Parse JSON entity into SQL and insert in db. Returns the new record id.
exports.insert = function(entity, cascaded) {

	log.info('Inserting ZEUS_BOARD entity cascaded['+cascaded+']');

	if(entity === undefined || entity === null){
		throw new Error('Illegal argument: entity is ' + entity);
	}
	
	for(var i = 0; i< persistentProperties.mandatory.length; i++){
		var propName = persistentProperties.mandatory[i];
		if(propName === 'id')
			continue;//Skip validaiton check for id. It's epxected to be null on insert.
		var propValue = entity[propName];
		if(propValue === undefined || propValue === null){
			throw new Error('Illegal ' + propName + ' attribute value in ZEUS_BOARD entity for insert: ' + propValue);
		}
	}

	if(cascaded === undefined || cascaded === null){
		cascaded = false;
	}

    entity = createSQLEntity(entity);

    var connection = datasource.getConnection();
    try {
        var sql = "INSERT INTO ZEUS_BOARD (";
        sql += "ZEUSB_ID, ZEUSB_SHORT_TEXT, ZEUSB_DESCRIPTION, ZEUSB_USER, ZEUSB_PUBLISH_TIME, ZEUSB_LASTMODIFIED_TIME, ZEUSB_STATUS) "; 
        sql += "VALUES (?,?,?,?,?,?,?)";

        var statement = connection.prepareStatement(sql);
        
        var i = 0;
        entity.id = datasource.getSequence('ZEUS_BOARD_ZEUSB_ID').next();
        statement.setInt(++i,  entity.id);
        statement.setString(++i, entity.shortText);        
        statement.setString(++i, entity.description);

        //TODO: move to frontend svc
        entity.user = userLib.getName();
        
        statement.setString(++i, entity.user);
        
		entity.publishTime = Date.now();
        statement.setLong(++i, entity.publishTime);
       	entity.lastModifiedTime = entity.publishTime;
       	statement.setLong(++i, entity.lastModifiedTime);

        statement.setString(++i, entity.status);//FIXME: use codes instead        
        
        statement.executeUpdate();

		if(cascaded){
			if(entity[itemsEntitySetName] && entity[itemsEntitySetName].length > 0){
	        	for(var j=0; j<entity[itemsEntitySetName].length; j++){
	        		var item = entity[itemsEntitySetName][j];
	        		item.boi_boh_name = entity.boh_name;
					commentsLib.insert(item);        				
	    		}
	    	}
		}

        log.info('ZEUS_BOARD[' +  entity.id + '] entity inserted');

        return entity.id;

    } catch(e) {
		e.errContext = sql;
		throw e;
    } finally {
        connection.close();
    }
};

// Reads a single entity by id, parsed into JSON object 
exports.find = function(id, expanded) {

	log.info('Finding ZEUS_BOARD_STATS[' + id + '] entity');

	if(id === undefined || id === null){
		throw new Error('Illegal argument for id parameter:' + id);
	}

    var connection = datasource.getConnection();
    try {
        var entity;
        var sql = "SELECT * FROM ZEUS_BOARD_STATS WHERE " + exports.pkToSQL();
     
        var statement = connection.prepareStatement(sql);
        statement.setInt(1, id);

        var resultSet = statement.executeQuery();
        if (resultSet.next()) {
        	entity = createEntity(resultSet);
			if(entity){
            	log.info('ZEUS_BOARD_STATS[' + id + '] entity found');
				if(expanded !== null && expanded!==undefined){
				   var dependentItemEntities = commentsLib.findDiscussionPosts(entity.id, false);
				   if(dependentItemEntities) {
				   	 entity[itemsEntitySetName] = dependentItemEntities;
			   	   }
			   	   var currentUser = userLib.getName();
			   	   if(currentUser){
				   	   var userVote = boardVotes.getVote(id, currentUser);
				   	   entity.currentUserVote = userVote;
			   	   }
				}            	
        	} else {
	        	log.info('ZEUS_BOARD_STATS[' + id + '] entity not found');
        	}
        } 
        return entity;
    } catch(e) {
		e.errContext = sql;
		throw e;
    } finally {
        connection.close();
    }
};

exports.getComments = function(boardId, isFlat){
	return commentsLib.findDiscussionPosts(boardId, isFlat);
};

// Read all entities, parse and return them as an array of JSON objets
exports.list = function(limit, offset, sort, order, expanded, entityName) {

	log.info('Listing ZEUS_BOARD_STATS entity collection expanded['+expanded+'] with list operators: limit['+limit+'], offset['+offset+'], sort['+sort+'], order['+order+'], entityName['+entityName+']');
	
    var connection = datasource.getConnection();
    try {
        var entities = [];
        var sql = "SELECT";
        if (limit !== null && offset !== null) {
            sql += " " + datasource.getPaging().genTopAndStart(limit, offset);
        }
        sql += " * FROM ZEUS_BOARD_STATS";
        if (entityName !== undefined && entityName !== null) {
        	sql += " WHERE ZEUSB_SHORT_TEXT LIKE '" + entityName + "%%'";
    	}
        if (sort !== undefined && sort !== null) {
            sql += " ORDER BY " + sort;
        }
        if ((sort !== undefined && sort !== null) && (sort !== undefined && order !== null)) {
            sql += " " + order;
        }
        if ((limit !== undefined && limit !== null) && (offset !== undefined && offset !== null)) {
            sql += " " + datasource.getPaging().genLimitAndOffset(limit, offset);
        }

        var statement = connection.prepareStatement(sql);
        var resultSet = statement.executeQuery();
        while (resultSet.next()) {
        	var entity = createEntity(resultSet);
        	if(expanded !== null && expanded!==undefined){
			   var dependentItemEntities = commentsLib.list(entity.id, null, null, null, null);
			   if(dependentItemEntities) {
			   	 entity[itemsEntitySetName] = dependentItemEntities;
		   	   }
		   	   var currentUser = userLib.getName();
		   	   if(currentUser){
				   var userVote = boardVotes.getVote(entity.id, currentUser);
				   entity.currentUserVote = userVote;		   	   
		   	   }
			}
            entities.push(entity);
        }
        
        log.info('' + entities.length +' ZEUS_BOARD_STATS entities found');
        
        return entities;
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
	entity.id = resultSet.getInt("ZEUSB_ID");
    entity.shortText = resultSet.getString("ZEUSB_SHORT_TEXT");	
    entity.description = resultSet.getString("ZEUSB_DESCRIPTION");
    entity.user = resultSet.getString("USRU_UNAME");
   	entity.user_pic = resultSet.getString("USRU_PIC");
   	entity.status = resultSet.getString("ZEUSB_STATUS");
    entity.visits = resultSet.getString("ZEUSB_VISITS");
    entity.locked = resultSet.getShort("ZEUSB_LOCKED")>0?true:false;
        
    entity.publishTime = resultSet.getLong("ZEUSB_PUBLISH_TIME");
    entity.publishTime = new Date(entity.publishTime).toISOString();
    
    entity.lastModifiedTime = resultSet.getLong("ZEUSB_LASTMODIFIED_TIME");    
    if(entity.lastModifiedTime!==null)
    	entity.lastModifiedTime = new Date(entity.lastModifiedTime).toISOString();
    
	entity.latestDiscussionUpdateTime = resultSet.getLong("LATEST_UPDATE_TIME");
    if(entity.latestDiscussionUpdateTime!==null && entity.latestDiscussionUpdateTime>0)
    	entity.latestDiscussionUpdateTime = new Date(entity.latestDiscussionUpdateTime).toISOString();    
    
    entity.repliesCount = resultSet.getInt("REPLIES");  
    entity.participantsCount = resultSet.getInt("PARTICIPANTS");      
    entity.totalVotes = resultSet.getInt("TOTAL_VOTES");    
    entity.upvotes = resultSet.getInt("UPVOTES");
    entity.downvotes = resultSet.getInt("DOWNVOTES");        
    entity.rating = resultSet.getInt("RATING"); 
    
	for(var key in Object.keys(entity)){
		if(entity[key] === null)
			entity[key] = undefined;
	}	
    entity.editable = entity.user === userLib.getName();
    log.info("Transformation from ZEUS_BOARD["+entity.id+"] DB JSON object finished");
    return entity;
}

//Prepare a JSON object for insert into DB
function createSQLEntity(entity) {
	var persistentItem = {};
	for(var i=0;i<persistentProperties.mandatory.length;i++){
		persistentItem[persistentProperties.mandatory[i]] = entity[persistentProperties.mandatory[i]];
	}
	for(var i=0;i<persistentProperties.optional.length;i++){
		if(entity[persistentProperties.optional[i]] !== undefined){
			persistentItem[persistentProperties.optional[i]] = entity[persistentProperties.optional[i]];
		} else {
			persistentItem[persistentProperties.optional[i]] = null;
		}
	}	

	if(entity.locked === false){
		persistentItem.locked = 0;
	} else {
		persistentItem.locked = 1;
	}
	
	if(entity.publishTime){
		persistentItem.publishTime = new Date(entity.publishTime).getTime();
	} 
	if(entity.latestpublishTime){
		persistentItem.latestpublishTime = new Date(entity.latestpublishTime).getTime();
	}
	
	log.info("Transformation to ZEUS_BOARD["+entity.id+"] DB JSON object finished");
	return persistentItem;
}

// update entity from a JSON object. Returns the id of the updated entity.
exports.update = function(entity) {

	log.info('Updating ZEUS_BOARD[' + entity!==undefined?entity.id:entity + '] entity');

	if(entity === undefined || entity === null){
		throw new Error('Illegal argument: entity is ' + entity);
	}	
	
	for(var i = 0; i< persistentProperties.mandatory.length; i++){
		var propName = persistentProperties.mandatory[i];
		var propValue = entity[propName];
		if(propValue === undefined || propValue === null){
			throw new Error('Illegal ' + propName + ' attribute value in ZEUS_BOARD entity for update: ' + propValue);
		}
	}
	
	entity = createSQLEntity(entity);
	
    var connection = datasource.getConnection();
    try {
    
        var sql = "UPDATE ZEUS_BOARD";
        sql += " SET ZEUSB_SHORT_TEXT=?, ZEUSB_DESCRIPTION=?, ZEUSB_USER=?, ZEUSB_LASTMODIFIED_TIME=?, ZEUSB_STATUS=?, ZEUSB_LOCKED=?"; 
        sql += " WHERE ZEUSB_ID = ?";
        var statement = connection.prepareStatement(sql);
        var i = 0;
        statement.setString(++i, entity.shortText);        
        statement.setString(++i, entity.description);
        statement.setString(++i, entity.user);
        statement.setLong(++i, Date.now());
        statement.setString(++i, entity.status);
        statement.setShort(++i, entity.locked);
        var id = entity.id;
        statement.setInt(++i, id);
        statement.executeUpdate();
            
        log.info('ZEUS_BOARD[' + id + '] entity updated');
        
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

	log.info('Deleting ZEUS_BOARD[' + id + '] entity');

    var connection = datasource.getConnection();
    try {
    
    	var sql = "DELETE FROM ZEUS_BOARD";
	 	if(id.constructor !== Array){
	 		sql += " WHERE " + exports.pkToSQL();
	 	} else {
	 		sql += " WHERE " + exports.getPrimaryKeys() + " IN (";
	 		for(var i=0;i<id.length;i++){
	 			sql+="?,";
	 		}
	 		sql = sql.substring(0,sql.length-1);
	 		sql += ")";
	 	}
        var statement = connection.prepareStatement(sql);
        if(id.constructor !== Array){
        	statement.setInt(1, id);
        } else {
        	for(var i=1;i<id.length+1;i++){
        		statement.setInt(i, id[i-1]);
	 		}
        }
        statement.executeUpdate();
        
        if(id.constructor !== Array){
        	id = [id];
   	 	}
   	 	for(var i=0; i<id.length; i++){
			var dependentItems = commentsLib.list(id[i]);
			log.info('Deleting ZEUS_BOARD['+id[i]+'] entity\'s '+dependentItems.length+' dependent posts');
			for(var j = 0; j < dependentItems.length; j++) {
	    		commentsLib.remove(dependentItems[j].id);
			}
   	 	}
        
        log.info('ZEUS_BOARD[' + id + '] entity deleted');
        
        return this;

    } catch(e) {
		e.errContext = sql;
		throw e;
    } finally {
        connection.close();
    }
};

exports.count = function() {

	log.info('Counting ZEUS_BOARD entities');

    var count = 0;
    var connection = datasource.getConnection();
    try {
    	var sql = 'SELECT COUNT(*) FROM ZEUS_BOARD';
        var statement = connection.prepareStatement(sql);
        var rs = statement.executeQuery();
        if (rs.next()) {
            count = rs.getInt(1);
        }
    } catch(e) {
		e.errContext = sql;
		throw e;
    } finally {
        connection.close();
    }
    
    log.info('' + count + ' ZEUS_BOARD entities counted');

    return count;
};

exports.visit = function(boardId){
	log.info('Updating DIS_BOARD['+boardId+'] entity visits');
	var connection = datasource.getConnection();
    try {
    
        var sql = "UPDATE ZEUS_BOARD";
        sql += " SET ZEUSB_VISITS=ZEUSB_VISITS+1"; 
        sql += " WHERE ZEUSB_ID = ?";
        var statement = connection.prepareStatement(sql);
        statement.setInt(1, boardId);        
        statement.executeUpdate();
        log.info('ZEUS_BOARD['+boardId+'] entity visits updated');
        return this;
        
    } catch(e) {
		e.errContext = sql;
		throw e;
    } finally {
        connection.close();
    }
};

exports.lock = function(boardId){
    log.info('Updating ZEUS_BOARD[' +  boardId+ '] entity lock[true]');
	var connection = datasource.getConnection();
	try{
		var sql =  "UPDATE ZEUS_BOARD SET ZEUSB_LOCKED=1 WHERE ZEUSB_ID=?";
        var statement = connection.prepareStatement(sql);
        statement.setInt(1, boardId);	    
	    statement.executeUpdate();
    	log.info('ZEUS_BOARD[' +  boardId+ '] entity lock[true] updated');
	} catch(e) {
		e.errContext = sql;
		throw e;
    } finally {
        connection.close();
    }
};

exports.unlock = function(boardId){
	log.info('Updating ZEUS_BOARD[' +  boardId + '] entity lock[false]');
	var connection = datasource.getConnection();
	try{
		var sql = "UPDATE ZEUS_BOARD SET ZEUSDISB_LOCKED=0 WHERE ZEUSB_ID=?";
        var statement = connection.prepareStatement(sql);
        statement.setInt(1, boardId);	    
	    statement.executeUpdate();
	    log.info('ZEUS_BOARD[' +  boardId + '] entity lock[false] updated');
	} catch(e) {
		e.errContext = sql;
		throw e;
    } finally {
        connection.close();
    }
};

exports.isLocked = function(boardId){
    log.info('Finding ZEUS_BOARD[' +  boardId+ '] entity lock value');
	var connection = datasource.getConnection();
	try{
		var sql = "SELECT ZEUSB_LOCKED FROM ZEUS_BOARD WHERE ZEUSB_ID=?";
        var statement = connection.prepareStatement(sql);
        statement.setInt(1, boardId);
        var resultSet = statement.executeQuery();
        
        var isLocked = false;
        if (resultSet.next()) {
        	isLocked = resultSet.getShort('ZEUSB_LOCKED')===1;
        }
        log.info('ZEUS_BOARD[' +  boardId+ '] entity lock value found');
        return isLocked;
	} catch(e) {
		e.errContext = sql;
		throw e;
    } finally {
        connection.close();
    }
};

exports.getPrimaryKeys = function() {
    var result = [];
    var i = 0;
    result[i++] = 'ZEUSB_ID';
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
