/* globals $ */
/* eslint-env node, dirigible */
(function(){
"use strict";

var CommentsORM = {
	dbName: "ZEUS_IDEAS_COMMENT",
	properties: [
		{
			name: "id",
			dbName: "ZEUS_IDEASC_ID",
			id: true,
			required: true,
			type: "Long"
		},{
			name: "boardId",
			dbName: "ZEUS_IDEASC_ZEUS_IDEASB_ID",
			required: true,
			type: "Long"
		},{
			name: "replyToCommentId",
			dbName: "ZEUS_IDEASC_REPLY_TO_ZEUS_IDEASC_ID",
			type: "Long",
			dbValue: function(name, entity){
				return entity.replyToCommentId !==undefined ? entity.replyToCommentId : null;//TODO: Fixme as soon as all -1 entries are updated to null. Will work with null isntead of -1
			},
			value: function(dbValue){
				return dbValue === null || dbValue<1 ? undefined : dbValue;//TODO: Fixme as soon as all -1 entries are updated to null. Will work with null isntead of -1
			},
		},{
			name: "text",
			dbName: "ZEUS_IDEASC_COMMENT_TEXT",
			type: "String",
			size: 10000
		},{
			name: "publishTime",
			dbName: "ZEUS_IDEASC_PUBLISH_TIME",
			required: true,
			type: "Long",
			dbValue: function(name, entity){
				return entity.publishTime !== undefined ? new Date(entity.publishTime).getTime() : null;
			},
			value: function(dbValue){
				return dbValue !== null ? new Date(dbValue).toISOString() : undefined;
			},
			allowedOps: ['insert']
		},{
			name: "lastModifiedTime",
			dbName: "ZEUS_IDEASC_LASTMODIFIED_TIME",
			type: "Long",
			dbValue: function(name, entity){
				return entity.lastModifiedTime !== undefined ? new Date(entity.lastModifiedTime).getTime() : null;
			},
			value: function(dbValue){
				return dbValue !== null ? new Date(dbValue).toISOString() : undefined;
			}
		},{
			name: "user",
			dbName: "ZEUS_IDEASC_USER",
			type: "String",
			size: 100,
			dbValue: function(name, entity){
				return require("net/http/user").getName();
			}
		}	
	],
	associationSets: {
		replies: {
			joinKey: "replyToCommentId",
			associationType: 'one-to-many',
			defaults: {
				flat:true
			}
		},
		board: {
			dao: require("zeus_ideas/lib/board_dao").get,
			associationType: 'many-to-one',
			joinKey: "boardId"
		}
	}
};

var DAO = require('daoism/dao').DAO;
var CommentDAO  = exports.CommentDAO = function(orm){
	orm = orm || CommentsORM;
	DAO.call(this, orm, 'Comment DAO');
};
CommentDAO.prototype = Object.create(DAO.prototype);
CommentDAO.prototype.constructor = CommentDAO;

exports.get = function(){
	var dao = new CommentDAO(CommentsORM);
	return dao;
};

})();
