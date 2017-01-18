/* globals $ */
/* eslint-env node, dirigible */
(function(){
"use strict";

var database = require("db/database");
var datasource = database.getDatasource();

var log = require("zeus/ideas/logging/logger").logger;
log.ctx = "Board DAO";

exports.getVote = function(id, user){

	log.info('Finging USR_USER['+user+'] vote for ZEUS_BOARD['+id+'] entity');

	if(id === undefined || id === null){
		throw new Error('Illegal argument for id parameter:' + id);
	}
	
	if(user === undefined || user === null){
		throw new Error('Illegal argument for user parameter:' + user);
	}	

    var connection = datasource.getConnection();
    var vote = 0;
    try {
        var sql = "SELECT * FROM ZEUS_BOARD_VOTE WHERE ZEUSV_ZEUSB_ID=? AND ZEUSV_USER=?";
        var statement = connection.prepareStatement(sql);
        statement.setInt(1, id);
        statement.setString(2, user);
        
        var resultSet = statement.executeQuery();
        if (resultSet.next()) {
            vote = resultSet.getInt("ZEUSV_VOTE");
			if(vote!==0){
            	log.info('USR_USER['+user+'] vote for ZEUS_BOARD['+id+'] entity found');
        	}
        } 
    } catch(e) {
		e.errContext = sql;
		throw e;
    } finally {
        connection.close();
    }
	
	return vote;
};

exports.vote = function(id, user, vote){
	log.info("Recording user["+user+"] vote["+vote+"] for ZEUS_BOARD["+id+"]");
	if(vote===0 || vote === undefined)
		throw Error('Illegal Argument: vote cannot be 0 or undefined');

	var previousVote = exports.getVote(id, user);

	var connection = datasource.getConnection();
    try {
    	var statement, sql, isInsert;
    	if(previousVote === undefined || previousVote === null || previousVote === 0){
    		//Operations is INSERT
    		isInsert = true; 
    		log.info("Inserting ZEUS_BOARD_VOTE relation between ZEUS_BOARD["+id+"] and USR_USER["+user+"]");
	        sql = "INSERT INTO ZEUS_BOARD_VOTE (ZEUSV_ID, ZEUSV_ZEUSB_ID, ZEUSV_USER, ZEUSV_VOTE) VALUES (?,?,?,?)";
	        statement = connection.prepareStatement(sql);
	        
	        var i = 0;
	        var voteId = datasource.getSequence('ZEUS_BOARD_VOTE_ZEUSV_ID').next();
	        statement.setInt(++i, voteId);
	        statement.setInt(++i, id);
	        statement.setString(++i, user);        
	        statement.setShort(++i, vote);	        
		} else {
    		//Operations is UPDATE
			isInsert = false;
			log.info("Updating ZEUS_BOARD_VOTE relation between ZEUS_BOARD["+id+"] and USR_USER["+user+"]");
	        sql = "UPDATE ZEUS_BOARD_VOTE SET ZEUSV_VOTE=? WHERE ZEUSV_ZEUSB_ID=? AND ZEUSV_USER=?";
	        statement = connection.prepareStatement(sql);
	        
	        var i = 0;
	       	statement.setShort(++i, vote);
	        statement.setInt(++i, id);
	        statement.setString(++i, user);        
		}
	    
	    statement.executeUpdate();
	    
	    var msgOperationResult = isInsert?"inserted":"updated";
	    log.info('ZEUS_BOARD_VOTE[' + voteId + '] entity relation between ZEUS_BOARD[' + id + '] and USR_USER[' + user + '] ' + msgOperationResult);
	    
        return voteId;

    } catch(e) {
		e.errContext = sql;
		throw e;
    } finally {
        connection.close();
    } 
};

})();
