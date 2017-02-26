/* globals $ */
/* eslint-env node, dirigible */
(function(){
"use strict";

var BoardVotesORM = {
	dbName: "ZEUS_IDEAS_BOARD_VOTE",
	properties: [
		{
			name: "id",
			dbName: "ZEUS_IDEASV_ID",
			id: true,
			required: true,
			type: "Long"
		},{
			name: "boardId",
			dbName: "ZEUS_IDEASV_ZEUS_IDEASB_ID",
			required: true,
			type: "Long"
		},{
			name: "user",
			dbName: "ZEUS_IDEASV_USER",
			required: true,
			type: "String",
			size: 100
		},{
			name: "vote",
			dbName: "ZEUS_IDEASV_VOTE",
			required: true,
			type: "Short"
		}
	]
};

var DAO = require('daoism/dao').DAO;
var BoardVotesDAO = exports.BoardVotesDAO = function(orm){
	orm = orm || BoardVotesORM;
	DAO.call(this, orm, 'BoardVotesDAO');
};
BoardVotesDAO.prototype = Object.create(DAO.prototype);
BoardVotesDAO.prototype.constructor = BoardVotesDAO;

BoardVotesDAO.prototype.getVote = function(boardId, user){
	var voteEntity = this.list({
		boardId: boardId,
		user: user
	})[0];
	var vote = 0;
	if(voteEntity)
		vote = voteEntity.vote;
	return vote;
};

//upsert
BoardVotesDAO.prototype.vote = function(boardId, user, vote){
	//First check that the user is not the board author: authors are not allowed to vote their own boards.
	var boardDao = require("zeus_ideas/lib/board_dao").get();
	var board = boardDao.find(boardId, undefined, ['user']);
	if(!board)
		throw Error('Illegal argument: no records for boardId['+boardId+']');
	if(board.user === user)
		throw Error('Illegal argument: user['+user+'] is nto eligible to vote because is the board author');
		
	var previousVote = this.list({
							boardId: boardId,
							user: user
						})[0];
	if(previousVote === undefined || previousVote === null || previousVote === 0){
		//Operations is INSERT
		this.$log.info("Inserting "+this.orm.dbName+" relation between ZEUS_IDEAS_BOARD["+boardId+"] and IAM_USER["+user+"]");
		this.insert({
			vote: vote,
			boardId: boardId,
			user: user
		});
	} else {
		//Operations is UPDATE
		var params = {};
		params[this.orm.getPrimaryKey().name] = previousVote[this.orm.getPrimaryKey().name];
		params['vote'] = vote;
		params['boardId'] = boardId;
		params['user'] = user;		
		this.update(params);
	}
};

exports.get = function(orm){
	return new BoardVotesDAO(orm || BoardVotesORM);
};

})();
