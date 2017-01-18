(function(angular){
"use strict";

	angular.module('discussion-boards')
	.service('Board', ['$resource', '$log', function($resource, $log) {
	  	return $resource('../../../js/zeus/ideas/svc/board.js/:boardId', { boardId:'@id' }, {
			    save: {
			        method: 'POST',
			        interceptor: {
		                response: function(res) {
		                	var location = res.headers('Location');
		                	if(location){
		                		var id = location.substring(location.lastIndexOf('/')+1);
		                		angular.extend(res, { "id": id });
	                		} else {
	                			$log.error('Cannot infer id after save operation. HTTP Response Header "Location" is missing: ' + location);
	            			}
	                        return res;
		                }
		            }, 
		            isArray: false
			    },
			    update: {
			        method: 'PUT'
			    }
			});
	}])
	.service('BoardCount', ['$resource', function($resource) {
	  	return $resource('../../../js/zeus/ideas/svc/board.js/count', {}, 
	  			{get: {method:'GET', params:{}, isArray:false, ignoreLoadingBar: true}});
	}])	
	.service('BoardVote', ['$resource', function($resource) {
	  	return $resource('../../../js/zeus/ideas/svc/board.js/:boardId/vote', {}, 
	  			{get: {method:'GET', params:{}, isArray:false, ignoreLoadingBar: true}},
	  			{save: {method:'POST', params:{}, isArray:false, ignoreLoadingBar: true}});
	}])	
	.service('BoardVisits', ['$resource', function($resource) {
	  	return $resource('../../../js/zeus/ideas/svc/board.js/:boardId/visit', {}, 
	  			{update: {method:'PUT', params:{}, isArray:false, ignoreLoadingBar: true}});
	}])		
	.service('BoardTags', ['$resource', function($resource) {
	  	return $resource('../../../js/zeus/ideas/svc/board.js/:boardId/tags', {}, 
	  			{
	  				get: {method:'GET', params:{}, isArray:true, ignoreLoadingBar: true},
	  				save: {method:'POST', params:{}, isArray:true, ignoreLoadingBar: true},
	  				remove: {method:'DELETE', params:{}, isArray:true, ignoreLoadingBar: true}
	  			});
	}])	
	.service('BoardComments', ['$resource', function($resource) {
	  	return $resource('../../../js/zeus/ideas/svc/board.js/:boardId/comments/:listMode', {}, 
	  			{get: {method:'GET', params:{}, isArray:true, ignoreLoadingBar: true}});
	}])	
	.service('$Comment', ['$resource', '$log', function($resource, $log) {
	 	return $resource('../../../js/zeus/ideas/svc/comment.js/:commentId', { commentId:'@id' }, {
			    save: {
			        method: 'POST',
			        interceptor: {
		                response: function(res) {
		                	var location = res.headers('Location');
		                	if(location){
		                		var id = location.substring(location.lastIndexOf('/')+1);
		                		angular.extend(res, { "id": id });
	                		} else {
	                			$log.error('Cannot infer id after save operation. HTTP Response Header "Location" is missing: ' + location);
	            			}
	                        return res;
		                }
		            }, 
		            isArray: false
			    },
			    update: {
			        method: 'PUT'
			    }
			});
	}])
	.service('$LoggedUser', ['$resource', '$log', function($resource) {
		var UserSvc =  $resource('../../../js/usr/svc/user.js/$current', {}, 
	  					{get: {method:'GET', params:{}, isArray:false, ignoreLoadingBar: true}});
	  	var get = function(){
		  	return UserSvc.get().$promise;
	  	};
	  	return {
	  		get: get
	  	};
	}])
	.service('$UserImg', ['$resource', function($resource) {
		var UserSvc = $resource('../../../js/usr/svc/user.js/$pics/:userName', {}, 
	  					{get: {method:'GET', params:{}, isArray:false, cache: true, ignoreLoadingBar: true}});
		var get = function(userName){
		  	return UserSvc.get({"userName":userName}).$promise
		  	.then(function(userData){
		  		return userData;
		  	});
	  	};	  					
	  	return {
	  		get: get
	  	};	  					
	}]);
})(angular);
