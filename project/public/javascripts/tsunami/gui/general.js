tsunami.tools.namespace('tsunami.gui');

(function() {
  
  var contacts = tsunami.contacts;
  var tools = tsunami.tools;
  var ajax = tsunami.tools.Router.ajax;
  var gui = tsunami.gui;
  
  gui.General = function() {
    
    var changeTheme = function(theme) {
        ajax('Profile.changeTheme', {theme: theme});
        /// On fly change theme effect
        // make the new href
        var currentHref = $('#cssTheme').attr('href');
        var newHref = currentHref.substring(0,currentHref.lastIndexOf('/')+1)+theme+currentHref.substring(currentHref.lastIndexOf('.')); // Make a correct href (path can changes)
        
        var tempNode = $('<link rel="stylesheet" type="text/css" href="'+newHref+'" charset="utf-8" />').appendTo('head');
        tempNode.bind('ready', function() {
          $('#cssTheme').attr('href', newHref);
          tempNode.remove();
        });
        
    };
    
    return {
      init: function() {
        $('#themeSelect .theme').click(function() {
          changeTheme($(this).text());
        });
      }
    }
  }();
  $(document).ready(gui.General.init);
  
  
  /**
   * TODO @gren : loading timeout.
   * display an error message if timeout is reaches and no other show or hide function was called.
   */
  gui.StatusBar = function() {
	var node = null;
		
	var showLoad = function(message) {
		node.show();
		$('.message', node).text(message);
	}

	return {
		init: function() {
		  node = $('#statusBar');
		  showLoad('Chargement en cours...');
		},
		
		showLoad: showLoad,
		hide: function() {
		  node.hide();
		}
	}
  }();
  $(document).ready(gui.StatusBar.init);
  
}());
