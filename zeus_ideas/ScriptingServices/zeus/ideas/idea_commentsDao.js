/* globals $ */
/* eslint-env node, dirigible */

var database = require('db/database');
var datasource = database.getDatasource();
var idea_commentsDaoExtensionsUtils = require('zeus/ideas/idea_commentsDaoExtensionUtils');
var user = require('net/http/user');

// Create an entity
exports.create = function(entity) {
    var connection = datasource.getConnection();
    try {
        var sql = 'INSERT INTO ZEUS_IDEA_COMMENTS (IDEAC_ID,IDEAC_IDEA_ID,IDEAC_COMMENT,IDEAC_CREATED_AT,IDEAC_CREATED_BY) VALUES (?,?,?,?,?)';
        var statement = connection.prepareStatement(sql);
        var i = 0;
        var id = datasource.getSequence('ZEUS_IDEA_COMMENTS_IDEAC_ID').next();
        statement.setInt(++i, id);
        statement.setInt(++i, entity.ideac_idea_id);
        statement.setString(++i, entity.ideac_comment);
        statement.setTimestamp(++i, new Date());
        statement.setString(++i, user.getName());
		idea_commentsDaoExtensionsUtils.beforeCreate(connection, entity);
        statement.executeUpdate();
        idea_commentsDaoExtensionsUtils.afterCreate(connection, entity);
    	return id;
    } finally {
        connection.close();
    }
};

// Return a single entity by Id
exports.get = function(id) {
	var entity = null;
    var connection = datasource.getConnection();
    try {
        var sql = 'SELECT * FROM ZEUS_IDEA_COMMENTS WHERE IDEAC_ID = ?';
        var statement = connection.prepareStatement(sql);
        statement.setInt(1, id);

        var resultSet = statement.executeQuery();
        if (resultSet.next()) {
            entity = createEntity(resultSet);
        }
    } finally {
        connection.close();
    }
    return entity;
};

// Return all entities
exports.list = function(limit, offset, sort, desc, idea) {
    var result = [];
    if (idea === null || idea === undefined) {
    	return result;
	}
    var connection = datasource.getConnection();
    try {
        var sql = 'SELECT ';
        if (limit !== null && offset !== null) {
            sql += ' ' + datasource.getPaging().genTopAndStart(limit, offset);
        }
        sql += ' * FROM ZEUS_IDEA_COMMENTS';
        sql += ' WHERE IDEAC_IDEA_ID=?';
        if (sort !== null) {
            sql += ' ORDER BY ' + sort;
        }
        if (sort !== null && desc !== null) {
            sql += ' DESC ';
        }
        if (limit !== null && offset !== null) {
            sql += ' ' + datasource.getPaging().genLimitAndOffset(limit, offset);
        }
        var statement = connection.prepareStatement(sql);
        statement.setInt(1, idea);
        var resultSet = statement.executeQuery();
        while (resultSet.next()) {
            result.push(createEntity(resultSet));
        }
    } finally {
        connection.close();
    }
    return result;
};

// Update an entity by Id
exports.update = function(entity) {
    var connection = datasource.getConnection();
    try {
        var sql = 'UPDATE ZEUS_IDEA_COMMENTS SET IDEAC_IDEA_ID = ?,IDEAC_COMMENT = ?,IDEAC_CREATED_AT = ?,IDEAC_CREATED_BY = ? WHERE IDEAC_ID = ?';
        var statement = connection.prepareStatement(sql);
        var i = 0;
        statement.setInt(++i, entity.ideac_idea_id);
        statement.setString(++i, entity.ideac_comment);
        if (entity.ideac_created_at !== null) {
            var js_date_ideac_created_at =  new Date(Date.parse(entity.ideac_created_at));
            statement.setTimestamp(++i, js_date_ideac_created_at);
        } else {
            statement.setTimestamp(++i, null);
        }
        statement.setString(++i, entity.ideac_created_by);
        var id = entity.ideac_id;
        statement.setInt(++i, id);
		idea_commentsDaoExtensionsUtils.beforeUpdate(connection, entity);
        statement.executeUpdate();
        idea_commentsDaoExtensionsUtils.afterUpdate(connection, entity);
    } finally {
        connection.close();
    }
};

// Delete an entity
exports.delete = function(entity) {
    var connection = datasource.getConnection();
    try {
    	var sql = 'DELETE FROM ZEUS_IDEA_COMMENTS WHERE IDEAC_ID = ?';
        var statement = connection.prepareStatement(sql);
        statement.setString(1, entity.ideac_id);
        idea_commentsDaoExtensionsUtils.beforeDelete(connection, entity);
        statement.executeUpdate();
        idea_commentsDaoExtensionsUtils.afterDelete(connection, entity);
    } finally {
        connection.close();
    }
};

// Return the entities count
exports.count = function() {
    var count = 0;
    var connection = datasource.getConnection();
    try {
    	var sql = 'SELECT COUNT(*) FROM ZEUS_IDEA_COMMENTS';
        var statement = connection.prepareStatement(sql);
        var rs = statement.executeQuery();
        if (rs.next()) {
            count = rs.getInt(1);
        }
    } finally {
        connection.close();
    }
    return count;
};

// Returns the metadata for the entity
exports.metadata = function() {
	var metadata = {
		name: 'zeus_idea_comments',
		type: 'object',
		properties: [
		{
			name: 'ideac_id',
			type: 'integer',
			key: 'true',
			required: 'true'
		},
		{
			name: 'ideac_idea_id',
			type: 'integer'
		},
		{
			name: 'ideac_comment',
			type: 'string'
		},
		{
			name: 'ideac_created_at',
			type: 'timestamp'
		},
		{
			name: 'ideac_created_by',
			type: 'string'
		},
		]
	};
	return metadata;
};

// Create an entity as JSON object from ResultSet current Row
function createEntity(resultSet) {
    var result = {};
	result.ideac_id = resultSet.getInt('IDEAC_ID');
	result.ideac_idea_id = resultSet.getInt('IDEAC_IDEA_ID');
    result.ideac_comment = resultSet.getString('IDEAC_COMMENT');
    if (resultSet.getTimestamp('IDEAC_CREATED_AT') !== null) {
        result.ideac_created_at = new Date(resultSet.getTimestamp('IDEAC_CREATED_AT').getTime());
    } else {
        result.ideac_created_at = null;
    }
    result.ideac_created_by = resultSet.getString('IDEAC_CREATED_BY');
    return result;
}

