/* globals $ */
/* eslint-env node, dirigible */

const PATH = "/ideas";
const HTML_LINK = "../zeus_ideas/index.html";

//exports.getMenuItem = function() {
//	return {  
//      "name": "Ideas",
//      "path": PATH,
//      "link": HTML_LINK
//   };
//};

exports.getSidebarItem = function() {
	return {  
      "name": "Ideas",
      "path": PATH,
      "link": HTML_LINK
   };
};
