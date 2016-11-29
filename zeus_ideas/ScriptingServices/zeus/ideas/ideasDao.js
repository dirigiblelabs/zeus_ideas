/* globals $ */
/* eslint-env node, dirigible */

var database = require('db/database');
var datasource = database.getDatasource();
var ideasDaoExtensionsUtils = require('zeus/ideas/ideasDaoExtensionUtils');
var user = require('net/http/user');

// Create an entity
exports.create = function(entity) {
    var connection = datasource.getConnection();
    try {
        var sql = 'INSERT INTO ZEUS_IDEAS (IDEA_ID,IDEA_NAME,IDEA_DESCRIPTION,IDEA_CREATED_AT,IDEA_CREATED_BY) VALUES (?,?,?,?,?)';
        var statement = connection.prepareStatement(sql);
        var i = 0;
        var id = datasource.getSequence('ZEUS_IDEAS_IDEA_ID').next();
        statement.setInt(++i, id);
        statement.setString(++i, entity.idea_name);
        statement.setString(++i, entity.idea_description);
        statement.setTimestamp(++i, new Date());
        statement.setString(++i, user.getName());
		ideasDaoExtensionsUtils.beforeCreate(connection, entity);
        statement.executeUpdate();
        ideasDaoExtensionsUtils.afterCreate(connection, entity);
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
        var sql = 'SELECT * FROM ZEUS_IDEAS WHERE IDEA_ID = ?';
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
exports.list = function(limit, offset, sort, desc) {
    var result = [];
    var connection = datasource.getConnection();
    try {
        var sql = 'SELECT ';
        if (limit !== null && offset !== null) {
            sql += ' ' + datasource.getPaging().genTopAndStart(limit, offset);
        }
        sql += ' * FROM ZEUS_IDEAS';
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
        var sql = 'UPDATE ZEUS_IDEAS SET IDEA_NAME = ?,IDEA_DESCRIPTION = ?,IDEA_CREATED_AT = ?,IDEA_CREATED_BY = ? WHERE IDEA_ID = ?';
        var statement = connection.prepareStatement(sql);
        var i = 0;
        statement.setString(++i, entity.idea_name);
        statement.setString(++i, entity.idea_description);
        if (entity.idea_created_at !== null) {
            var js_date_idea_created_at =  new Date(Date.parse(entity.idea_created_at));
            statement.setTimestamp(++i, js_date_idea_created_at);
        } else {
            statement.setTimestamp(++i, null);
        }
        statement.setString(++i, entity.idea_created_by);
        var id = entity.idea_id;
        statement.setInt(++i, id);
		ideasDaoExtensionsUtils.beforeUpdate(connection, entity);
        statement.executeUpdate();
        ideasDaoExtensionsUtils.afterUpdate(connection, entity);
    } finally {
        connection.close();
    }
};

// Delete an entity
exports.delete = function(entity) {
    var connection = datasource.getConnection();
    try {
    	var sql = 'DELETE FROM ZEUS_IDEAS WHERE IDEA_ID = ?';
        var statement = connection.prepareStatement(sql);
        statement.setString(1, entity.idea_id);
        ideasDaoExtensionsUtils.beforeDelete(connection, entity);
        statement.executeUpdate();
        ideasDaoExtensionsUtils.afterDelete(connection, entity);
    } finally {
        connection.close();
    }
};

// Return the entities count
exports.count = function() {
    var count = 0;
    var connection = datasource.getConnection();
    try {
    	var sql = 'SELECT COUNT(*) FROM ZEUS_IDEAS';
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
		name: 'zeus_ideas',
		type: 'object',
		properties: [
		{
			name: 'idea_id',
			type: 'integer',
			key: 'true',
			required: 'true'
		},
		{
			name: 'idea_name',
			type: 'string'
		},
		{
			name: 'idea_description',
			type: 'string'
		},
		{
			name: 'idea_created_at',
			type: 'timestamp'
		},
		{
			name: 'idea_created_by',
			type: 'string'
		},
		]
	};
	return metadata;
};

// Create an entity as JSON object from ResultSet current Row
function createEntity(resultSet) {
    var result = {};
	result.idea_id = resultSet.getInt('IDEA_ID');
    result.idea_name = resultSet.getString('IDEA_NAME');
    result.idea_description = resultSet.getString('IDEA_DESCRIPTION');
    if (resultSet.getTimestamp('IDEA_CREATED_AT') !== null) {
        result.idea_created_at = new Date(resultSet.getTimestamp('IDEA_CREATED_AT').getTime());
    } else {
        result.idea_created_at = null;
    }
    result.idea_created_by = resultSet.getString('IDEA_CREATED_BY');
    return result;
}

