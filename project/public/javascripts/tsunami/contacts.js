tsunami.tools.namespace('tsunami.contacts');

(function(){

  var contacts = tsunami.contacts;
  var tools = tsunami.tools;
  var ajax = tsunami.tools.Router.ajax;
  var esc = tools.escapeHtml;
  var log = tsunami.tools.log;
  
  contacts.Utils = {
    getAvatarTimestamp: function(node) {
      var now = new Date();
      if(!node || !$(node)[0])
        return now.getTime();
      var imgSrc = $(node).attr('src');
      var timestamp = null;
      if(imgSrc) {
        var spl = imgSrc.split('?');
        if(spl.length==2)
          timestamp=spl[1];
      }
      return timestamp || now.getTime();
    }
  };
  
  contacts.SelfAvatarPopup = function() {
    
    // Private //
    var g_node = null;

    var g_posx=0;
    var g_posy=0;
    
    var g_up_ip = false;
    
    var tpl_avatar = function() {
      return '<img class="avatar" src="'+tools.Router.url('Contacts.getAvatar', {size:'large', userid:tsunami.export.currentUser.userid})+'?'+contacts.Utils.getAvatarTimestamp('#'+contacts.List.userid2string(tsunami.export.currentUser.userid)+' img.avatar')+'" />';
    };
    
    var tpl = function() {
      return ('<h3>Mon avatar</h3>'+
          '<div class="imageContainer">'+
            tpl_avatar()+
          '</div>'+
          '<form class="uploadAvatar" enctype="multipart/form-data" action="/profile/avatar" method="POST">'+
            '<input type="file" name="file" />'+
            '<div><button>Envoyer</button>'+
          '<div class="uploadInProgress">Envoi en cours... <img src="/public/images/loading.gif"/></div></div>'+
          '</form>');
    };
    
    var make = function() {
      if(!g_node) {
        $('#application').append('<div id="contactListSelfAvatarPopup" class="theme theme-light level-60" />');
        g_node = $('#contactListSelfAvatarPopup');
        render();
      }
      updatePosition();
    };
    
    var render = function() {
      g_node.empty();
      g_node.append(tpl());
      bindAll();
    };
    
    var updateAvatar = function() {
      $('img.avatar', g_node).replaceWith( tpl_avatar() );
    };
    
    var updatePosition = function() {
      return g_node.css({top: g_posy, left: g_posx});
    };
    
    var show = function() {
      updateAvatar();
      updatePosition().show();
    };
    
    var hide = function() {
      if(!g_up_ip)
        g_node.hide();
    };
    
    var setUploadStatus = function(inProgress) {
      g_up_ip = !inProgress ? false : true;
      if(g_up_ip) {
        $('img.avatar', g_node).hide();
        $('.uploadInProgress', g_node).show();
      }
      else {
        $('img.avatar', g_node).show();
        $('.uploadInProgress', g_node).hide();
      }
    };
    
    var bindAll = function() {
      setUploadStatus(false);
      $('form.uploadAvatar', g_node).ajaxForm({
        beforeSubmit: function() {
          setUploadStatus(true);
        },
        success: function(data) {
          setUploadStatus(false);
          hide();
          contacts.List.touchAvatar(tsunami.export.currentUser.userid);
        },
        error: function() {
          setUploadStatus(false);
        }
      });
    }

    return {
      init: function() {
        make();
        hide();
        $(document).click(function(e) {
          if(!($(e.target).parents().is('#contactListSelfAvatarPopup') || $(e.target).is('#contactListSelfAvatarPopup') ) && !$(e.target).is('.imStatus')) {
            hide();
          }
        });
      },
      
      show: function(e) {
        g_posx = e.clientX;
        g_posy = e.clientY-$('#application').position().top;
        show();
      }
    };
  }();
  
  $(document).ready(contacts.SelfAvatarPopup.init);
  
  
  /**
   * Manage the Avatar on mouse over effect
   */
  contacts.AvatarPopup = function() {

    // Private //
    var g_nodeid = 'contactListAvatarPopup';
    var g_node = null;

    var g_userid=null;
    var g_posx=0;
    var g_posy=0;
    
    var tpl_avatar = function(userid, size, timestamp) {
      return '<img src="'+tools.Router.url('Contacts.getAvatar', {size:size, userid:userid})+(timestamp?('?'+timestamp):'')+'" />';
    };
    var make = function() {
      if(!g_node) {
        $('#application').append('<div id="'+g_nodeid+'" />');
        g_node = $('#'+g_nodeid);
      }
      if(g_userid) {
        /* 
         * Apply the same timestamp used at small avatar load to force the large avatar reload.
         */
        var timestamp = contacts.Utils.getAvatarTimestamp('#'+contacts.List.userid2string(g_userid)+' .avatar img');
        g_node.empty().append(tpl_avatar(g_userid,'large',timestamp));
      }
      updatePosition();
    };
    var updatePosition = function() {
      g_node.css({top: g_posy, left: g_posx});
    };
    var recordArgs = function(userid, posx, posy) {
      if(userid)
        g_userid = userid;
      g_posx = posx+8;
      g_posy = posy+8-$('#application').position().top;
    };

    return {
      init: function() {
        make();
        g_node.hide();
      },
      show: function(userid, posx, posy) {
       recordArgs(userid, posx, posy);
        make();
        g_node.show();
      },
      hide: function() {
        g_node.hide();
      },
      updatePosition: function(posx, posy) {
        recordArgs(null, posx, posy);
        updatePosition();
      }
    }
  }();
    
  $(document).ready(contacts.AvatarPopup.init);
  
  /**
   * Manage the contact add form and effects (auto completion, on the fly validation, ...)
   */
  contacts.ContactAdd = function() {
    
    var g_node = null;
    
    var tpl_contactAdd = function() {
      return ('<div class="addContact theme theme-dark level-20">'+
        '<form>'+
          '<span class="contactLabel">'+tools.i18n('contacts.contact')+' : </span>'+
          '<div style="float:right;">'+
            '<input name="contact" type="text" title="'+tools.i18n('contacts.emailOrUsername')+'"/>'+
            '<button class="ok">'+tools.i18n('form.OK')+'</button>'+
          '</div>'+
        '</form>'+
        '<div class="contactContainer" style="clear:both;"/>'+
        '<span class="info ifHaveContact">'+tools.i18n('contacts.moveContactToAGroup')+'</span>'+
      '</div>');
    };
    
    var show = function() {
      g_node.slideDown(300);
      resizeInput();
      $('input[name=user]',g_node).focus();
      $('.addContactSlider',g_node.parent()).addClass('isOpen');
      $('.text.addContact',g_node.parent()).hide();
      $('.text.close',g_node.parent()).show();
    };
    var close = function() {
      g_node.slideUp(300);
      $('.addContactSlider',g_node.parent()).removeClass('isOpen');
      $('.text.addContact',g_node.parent()).show();
      $('.text.close',g_node.parent()).hide();
    };
    
    var isOpen = function() {
      return $('.addContactSlider',g_node.parent()).hasClass('isOpen');
    };
    
    var resizeInput = function() {
      var width = $('#contactList').width()-$('.contactLabel',g_node).width()-$('.ok',g_node).width()-50;
      $('input',g_node).width(width);
    };
    
    var onAddContact = function(data) {
      $('input[name=user]',g_node).val("");
      close();
      contacts.List.addContact(data.userid);
    };
    
    var onAddContactError = function(data) {
      $('.contactContainer',g_node).empty();
      $('.ifHaveContact',g_node).hide();
      $('form',g_node).after('<div class="error">'+tools.validation.getResponseTextError(data.responseText)+'</div>');
    };
    
    // EVENT
    var onSubmit = function() {
      $('.error', g_node).remove();
      ajax("Contacts.searchContact", {contact: $('input[name=contact]',g_node).val()}, onAddContact, onAddContactError);
      return false;
    };
    
    // BIND
    var bindContactAdd = function() {
      $('form',g_node).submit(onSubmit);
      $('#contactList').resize(function(){
        if(isOpen)
          resizeInput();
      });
    };
    
    return {
      init: function(actionTabBodyNode) {
        g_node = $(actionTabBodyNode);
        g_node.append( tpl_contactAdd() );
        $('.ifHaveContact',g_node).hide();
        g_node.hide();
        bindContactAdd();
      },
      
      show: show,
      close: close
    }
  }();
  
  /**
   * Manage the context menu of the contact list and the current selected user
   */
  contacts.ActionTab = function() {
    
    var g_node = null;
    
    // TEMPLATES
    var tpl_actionTab = function() {
      return ('<div class="body"></div>'+
      '<div class="addContactSlider theme theme-hover theme-dark level-60">'+
        '<span class="close text">Fermer</span>'+
        '<span href="javascript:;" class="addContact text">'+
          '<img class="icon" src="/public/images/user_add.png" />'+
          tools.i18n('contacts.addContact')+
        '</span>'+
      '</div>');
    };
    
    // EVENT
    var onAddContactButtonClick = function(e) {
      contacts.ContactAdd.show();
    };
    
    // BINDS
    var bindActionTab = function() {
      contacts.ContactAdd.init($('.body',g_node));
      $('.text.addContact',g_node).show();
      $('.text.close',g_node).hide();
      $('.addContactSlider',g_node).click(function() {
        if(!$('.addContactSlider',g_node).hasClass('isOpen'))
          contacts.ContactAdd.show();
        else
          contacts.ContactAdd.close();
      });
    };
    
    return {
      init: function(selector) {
        g_node = $(selector);
        g_node.append( tpl_actionTab() );
        bindActionTab();
      }
    }
  }();
  
  contacts.List = function() {

    // PRIVATE //

    // Utils //
    var userid2string = function(userid) {
      return 'contact_'+userid;
    }
    var string2userid = function(str) {
      return str.substring(8);
    }
    var groupid2string = function(gn) {
      return 'group_'+gn;
    }
    var string2groupid = function(str) {
      return str.substring(6);
    }

    // Templates //

    var tpl_avatarOnly = function(userid, size) {
      var now = new Date(); // Technic to force image reload on each tpl call
      if(!size)
        size='small';
      return '<img class="avatar" src="'+tools.Router.url('Contacts.getAvatar', {size:size, userid:userid})+'?'+now.getTime()+'" />';
    };
    
    var tpl_avatar = function(user) {
      return('<div class="avatarContainer enabled">'+tpl_avatarOnly(user.userid)+tpl_imStatus(user.imStatus)+'</div>');
    };

    var tpl_imStatus = function(statusRaw) {
      if(!statusRaw)
        return '';
      var status = statusRaw.toLowerCase();
      return '<div class="imStatus '+status+'">&nbsp;</div>';
    };

    var tpl_syncStatus = function(status) {
      if(!status)
        return '';
      return '<div class="syncStatus '+status.toLowerCase()+'">'+tools.i18n("syncStatus."+status.toLowerCase())+'</div>';
    };

    var tpl_email = function(email) {
      return '<span class="email">('+email+')</span>';
    };

    var tpl_empty = function() {
      return '<div class="noContact">'+tools.i18n('contacts.noContact')+'.</div>';
    };

    var tpl_emptyGroup = function() {
      return '<div class="emptyGroup"><a href="javascript:;" class="removeGroup action"><img class="icon" src="/public/images/group_delete.png" />'+tools.i18n('contacts.removeThisGroup')+'</a></div>';
    };
    
    var tpl_addGroup = function() {
      return '<div class="addGroupDropZone theme theme-light level-40 theme-drophover"><img class="icon" src="/public/images/group_add.png" />Déposez ici un contact pour le mettre dans un nouveau groupe.</div>';
    };
    
    var tpl_self = function() {
      var user = tsunami.export.currentUser;
      var getRelativeImStatusArgs = function(status) {
        return  ('value="'+status+'"'+(status==user.imStatus.toLowerCase()?' selected="selected"':''));
      };
      return ('<div id="'+userid2string(user.userid)+'" class="self theme theme-light level-40">'+
        tpl_avatar(user)+
        '<div class="infos">'+
          '<div class="username linebreak">'+user.username+'</div> '+
          '<div class="linebreak submessageContainer">'+
            '<img class="icon" src="/public/images/user_comment.png" />'+
            '<span class="submessage linebreak" title="'+(user.submessage?esc(user.submessage):'')+'">'+(user.submessage?esc(user.submessage):'')+'</span>'+
          '</div>'+
          '<div>'+
            '<select class="status">'+
              '<option '+getRelativeImStatusArgs('available')+'>Disponible</option>'+
              '<option '+getRelativeImStatusArgs('unavailable')+'>Occupé</option>'+
              '<option '+getRelativeImStatusArgs('away')+'>Absent</option>'+
              '<option '+getRelativeImStatusArgs('invisible')+'>Invisible</option>'+
            '</select>'+
          '</div>'+
        '</div>'+
      '</div>');
    };
    
    var tpl_actionContainer = function(contact) {
      var html="";
      if(contact.syncStatus=='REQUESTED') {
        html+='<a href="javascript:;" class="accept action"><img class="icon" src="/public/images/user_add.png" title="'+tools.i18n('contacts.accept')+'"/></a>';
        html+='<a href="javascript:;" class="refuse action" style="margin-left:10px" title="'+tools.i18n('contacts.refuse')+'"><img class="icon" src="/public/images/user_delete.png"/></a>';
      } else {
        html+='<a href="javascript:;" class="remove action" title="'+tools.i18n('contacts.delete')+'"><img class="icon" src="/public/images/user_delete.png"/></a>';
        if(contact.syncStatus=='CONFIRMED')
          html+='<a href="javascript:;" class="chat action" style="margin-left:10px" title="'+tools.i18n('contacts.chat')+'"><img class="icon" src="/public/images/user_chat.png"/></a>';
      }
      return '<div class="actionContainer">'+html+'</div>';
    };
    
    var tpl_contact = function(contact) {
      return (''+
      '<div id="'+userid2string(contact.userid)+'" class="contact '+(contact.syncStatus?contact.syncStatus.toLowerCase():'')+'">'+
        (contact.syncStatus=='CONFIRMED' ? tpl_avatar(contact) : '<div class="avatarContainer">&nbsp;</div>')+
        '<div class="infos linebreak">'+
          '<span class="username">'+contact.username+'</span> '+
          (contact.email?tpl_email(contact.email):'')+
          ' '+
          (contact.syncStatus=='CONFIRMED' ?
          '<div class="submessage" title="'+esc(contact.submessage)+'">'+(contact.submessage?esc(contact.submessage):'&nbsp;')+'</div>':
          tpl_syncStatus(contact.syncStatus)
          )+
        '</div>'+
          tpl_actionContainer(contact)+
      '</div>');
    };

    var tpl_group = function(group) {
      var contactsTpl="";
      if(group.contacts.length==0)
        contactsTpl=tpl_emptyGroup();
      else
        for(var i in group.contacts)
          contactsTpl += tpl_contact(group.contacts[i]);
      return (''+
      '<div id="'+groupid2string(group.id)+'" class="group theme theme-box level-40 theme-hover radius theme-drophover">'+
        '<div class="head">'+
          '<div class="reduce ui-icon ui-icon-triangle-1-s" />'+
          '<span class="groupname">'+esc(group.name)+'</span> (<span class="contactsCount">'+group.contacts.length+'</span>)'+
          '</div>'+
        '<div class="contacts body">'+ // Need to remove the body class (replaced by contacts)
          contactsTpl+
        '</div>'+
      '</div>');
    };

    var tpl_list = function(list) {
      var groupsTpl = "";
      if(list.groups.length==0)
        groupsTpl=tpl_empty();
      else
        for(var i in list.groups)
          groupsTpl += tpl_group(list.groups[i]);
      return (tpl_self()+
        '<div class="body">'+
          '<div class="actionTab"></div>'+
          '<div class="dragContactContainment">'+
            tpl_addGroup()+
            '<div class="groups">'+
            groupsTpl+
            '</div>'+
          '</div>'+
        '</div>');
    };
    
    // Dynamic updates : touch //
    
    var reduceGroup = function(group, inverse) {
      var reduce = $(".head > .reduce", group);
      if(!inverse) {
        group.addClass('reduced');
        reduce.addClass("ui-icon-triangle-1-e");
        reduce.removeClass("ui-icon-triangle-1-s");
        $('.contacts', group).slideUp(200);
      }
      else {
        group.removeClass('reduced');
        reduce.removeClass("ui-icon-triangle-1-e");
        reduce.addClass("ui-icon-triangle-1-s");
        $('.contacts', group).show(); // or slideDown
      }
    };
    
    var updateContactsCounts = function() {
      $('#contactList .groups .group').each(function() {
        $('.head .contactsCount',this).text($('.contacts .contact',this).size());
      });
    };
    
    var touchAvatar = function(userid) {
      $('#'+userid2string(userid)+' .avatar').replaceWith(tpl_avatarOnly(userid, 'small'));
    };
    
    var touchImStatus = function(userid, newStatus) {
      $('#'+userid2string(userid)+' .imStatus').replaceWith(tpl_imStatus(newStatus));
    };
    
    // EVENTS //
    
    var onGroupNameEdit = function(newname) {
      var groupid = string2groupid( $(this).parents().filter('.group').attr('id') );
      var oldname = $(this).data('oldgroupname');
      if(oldname!=newname)
        renameGroup(groupid,newname);
      else
        $(this).empty().text( oldname );
    };
    
    var onSubmessageEdit = function(newSubmessage) {
      var oldSubmessage = tsunami.export.currentUser.submessage||"";
      var haveToUpload = (oldSubmessage!=newSubmessage);
      if(haveToUpload)
         updateSubmessage(newSubmessage);
      else
        $(this).empty().text( oldSubmessage ).attr('title',oldSubmessage);
    };
    
    var onDropGroup = function(e, ui) {
      var groupname = $('.groupname', this).text();
      var userid = string2userid( ui.draggable.attr('id') );
      if(ui.draggable.hasClass('adding')) {
        addContact(userid, groupname);
        ui.draggable.remove();
        contacts.ContactAdd.close();
      }
      else {
        var oldGroup = ui.draggable.parents().filter('.group');
        if( oldGroup.is( '#'+$(this).attr('id') ) )
          return; // Not dropped on another group
        moveContact( userid, groupname );
      }
    };
    
    var onDropAddGroup = function(e, ui) {
      var userid = string2userid( ui.draggable.attr('id') );

      var found = true;
      for(var i=1; found; ++i) {
        var groupname = tools.i18n('contacts.newGroup',i);
        found = false;
        $('#contactList .group .groupname').each(function() {
          if( $(this).text()==groupname )
            found = true;
        });
      }
      if(ui.draggable.hasClass('adding')) {
        addContact(userid, groupname);
        ui.draggable.remove();
        contacts.ContactAdd.close();
      }
      else
        moveContact( userid, groupname );
    };
    
    var onGroupReduceClick = function(e, d) {
      var group = $(this).parents().filter('.group');
      var reduced = group.hasClass('reduced');
      reduceGroup(group, reduced);
    };

    var onRemoveGroupClick = function(e) {
      removeGroup(string2groupid( $(this).parents().filter('.group').attr('id') ));
    };

    var onAvatarMouseover = function(e) {
      var node = $(this).parents().filter('.contact');
      if(node.size()==0)
        node = $(this).parents().filter('.self');
      var userid = string2userid(node.attr('id'));
      contacts.AvatarPopup.show(userid, e.clientX, e.clientY);
    };

    var onAvatarMouseout = function(e) {
      contacts.AvatarPopup.hide();
    };

    var onAvatarMouseMove = function(e) {
      contacts.AvatarPopup.updatePosition(e.clientX, e.clientY);
    };

    // from ajax requests //

    var onGetAllContacts = function(data) {
      $('#contactList').empty().append(tpl_list(data));
      bindContact('#contactList .contact');
      bindGroup('#contactList .group');
      bindAddGroupDropZone();
      bindContactList();
      bindSelfUser();
    };
    var onGetContact = function(data) {
      $( '#'+userid2string(data.userid) ).replaceWith( tpl_contact(data) );
      bindContact('#'+userid2string(data.userid));
    };

    var onAddContact = function(data) {
      $( '#'+userid2string(data.userid) ).remove();
      if($('#'+groupid2string(data.groupid)).size()==0)
        getGroup(data.groupid);
      else {
        var node = $( '#'+groupid2string(data.groupid)+' > .body' );
        if($('.contact',node).size()==0)
          node.empty();
        node.append( tpl_contact(data) );
      }
      bindContact('#'+userid2string(data.userid));
      reduceGroup($('#'+groupid2string(data.groupid)), true);
      updateContactsCounts();
    };

    var onRemoveContact = function(data) {
      $( '#'+userid2string(data.userid) ).remove();
      var node = $( '#'+groupid2string(data.groupid)+' > .body');
      if( $('.contact', node).size()==0 )
        node.empty().append( tpl_emptyGroup() );
      updateContactsCounts();
    };

    var onMoveContact = function(data) {
      $( '#'+userid2string(data.userid) ).remove();
      $('#contactList .group > .body').each(function() {
        var node = $(this);
        if( $('.contact', node).size()==0 )
          node.empty().append( tpl_emptyGroup() );
      });
      onAddContact(data);
    };

    var onAcceptContactInvitation = function(data) {
      $( '#'+userid2string(data.userid) ).replaceWith( tpl_contact(data) );
      bindContact('#'+userid2string(data.userid));
    };

    var onRefuseContactInvitation = function(data) {
      onRemoveContact(data);
    };

    var onGetGroup = function(data) {
      onAddGroup(data);
    };

    var onAddGroup = function(data) {
      $('#contactList .noContact').remove();
      $('#'+groupid2string(data.id)).remove();
      $('#contactList .groups').append( tpl_group(data) );
      bindGroup('#'+groupid2string(data.id));
      bindContact('#'+groupid2string(data.id)+' .contact');
    };

    var onRemoveGroup = function(data) {
      $('#'+groupid2string(data.id)).remove();
      var node = $('#contactList .groups');
      if($('.group', node).length==0)
        node.empty().append( tpl_empty() );
    };

    var onRenameGroup = function(data) {
      $('#'+groupid2string(data.id)+' .groupname')
      .text(data.name)
      .data('oldgroupname', data.name);
    };
    
    var onRenameGroupError = function() {
      $('#contactList .group .groupname').each(function(){
        $(this).empty().text( $(this).data('oldgroupname') );
      });
    };

    var onSelfUserUpdate = function(data) {
      tsunami.export.currentUser = data;
      $('#contactList > .self').replaceWith( tpl_self() );
      bindSelfUser();
    };
    
    var onSubmessageUpdate = function(data) {
      tsunami.export.currentUser = data;
      var submessage = tsunami.export.currentUser.submessage;
      if(!submessage) {
        $('#contactList > .self').replaceWith( tpl_self() );
        bindSelfUser();
      }
      else
        $('#contactList > .self .submessage').text( submessage ).attr('title',submessage);
    };
    
    var onSubmessageUpdateError = function() {
      $('#contactList > .self .submessage').empty().text( tsunami.export.currentUser.submessage||"" ).attr('title',esc(tsunami.export.currentUser.submessage));
    };

/*
    var onSuccess = function(o) {
      $('#messagesAjaxResult').removeClass('err').addClass('success').empty().append( '[DEBUG] requète ajax sur "'+o.action+'" réalisé avec succès.' );
    };
    var onError = function(o) {
      $('#messagesAjaxResult').addClass('err').removeClass('success').empty().append( '[DEBUG] requète ajax sur "'+o.action+'" a échoué.' );
    };
*/
    // AJAX : identical as server-side method //

    var getAllContacts = function() {
      ajax("Contacts.getAllContacts", null, onGetAllContacts);
    };
    var getContact = function(userid) {
      ajax("Contacts.getContact", {userid:userid}, onGetContact);
    };
    var addContact = function(userid, groupname) {
      ajax("Contacts.addContact", {userid: userid, groupname: groupname}, onAddContact);
    };
    var removeContact = function(userid) {
      ajax("Contacts.removeContact", {userid: userid}, onRemoveContact);
    };
    var moveContact = function(userid,groupname) {
      ajax("Contacts.moveContact", {userid:userid, groupname:groupname}, onMoveContact);
    };
    var acceptContactInvitation = function(userid) {
      ajax("Contacts.acceptContactInvitation", {userid:userid}, onAcceptContactInvitation);
    };
    var refuseContactInvitation = function(userid) {
      ajax("Contacts.refuseContactInvitation", {userid:userid}, onRefuseContactInvitation);
    };
    var getGroup = function(groupid) {
      ajax("Contacts.getGroup", {groupid:groupid}, onGetGroup);
    };
    var addGroup = function(groupname) {
      ajax("Contacts.addGroup", {groupname:groupname}, onAddGroup);
    };
    var removeGroup = function(groupid) {
      ajax("Contacts.removeGroup", {groupid:groupid}, onRemoveGroup);
    };
    var renameGroup = function(groupid,newgroupname) {
      ajax("Contacts.renameGroup", {groupid:groupid, newgroupname:newgroupname}, onRenameGroup, onRenameGroupError);
    };
    var changeStatus = function(status) {
      ajax("Contacts.changeStatus", {status:status.toUpperCase()}, function(data) {
        tsunami.export.currentUser = data;
        touchImStatus(tsunami.export.currentUser.userid, data.imStatus);
      });
    };
    var updateSubmessage = function(submessage) {
      ajax('Profile.updateSubmessage', {submessage: submessage}, onSubmessageUpdate, onSubmessageUpdateError);
    };
    
    // Binders //
    
    var bindContactList = function() {
      contacts.ActionTab.init('#contactList .actionTab');
      
      $('#contactList .contacts .avatarContainer.enabled')
        .live('mousemove', onAvatarMouseMove)
        .live('mouseover', onAvatarMouseover)
        .live('mouseout', onAvatarMouseout);

      $('#contactList .group .removeGroup').live('click', onRemoveGroupClick);
      updateHeight();
      
      $(document).trigger('window.contactList.ready');
    };
    
    var bindSelfUser = function() {
      $('#contactList .self .submessageContainer img.icon').click(function() {
        $('#contactList .self .submessage').click();
      });
      var submessage = $('#contactList .self .submessage');
      submessage.data('oldSubmessage', submessage.text());
      submessage.editable(onSubmessageEdit, {
        placeholder: tools.i18n('contacts.noSubmessage'),
        width: '80%',
        height: '14px',
        onblur: 'submit',
        select: true});
      $('#contactList .self .status option[value='+tsunami.export.currentUser.imStatus.toLowerCase()+']').attr('selected','selected');
      $('#contactList .self select.status').change(function() {
        changeStatus($(this).val());
      });
      // TODO : bind the change
      $('#contactList .self .imStatus').click(contacts.SelfAvatarPopup.show);
    };
    
    var bindContact = function(selector, containment) {
      if($(selector).size()==0)
        return;
      if(!containment)
        containment = '#contactList .dragContactContainment';
      $(selector).draggable({ 
        containment: containment,
        revert: true,
        revertDuration: 0,
        axis: 'y',
        zIndex: 99,
        distance: 4
      });
      $('.action.remove',selector).click(function() {
        var node = $(this).parents().filter('.contact');
        var contactId = string2userid(node.attr('id'));
        if(node.hasClass('adding'))
          node.remove();
        else
          removeContact(contactId);
      });
      $('.action.refuse',selector).click(function() {
        var contactId = string2userid($(this).parents().filter('.contact').attr('id'));
        refuseContactInvitation(contactId);
      });
      $('.action.accept',selector).click(function() {
        var contactId = string2userid($(this).parents().filter('.contact').attr('id'));
        acceptContactInvitation(contactId);
      });
    };
    
    var bindGroup = function(selector) {
      if($(selector).size()==0)
        return;
      $(selector).droppable({
        accept: '.contact',
        drop: onDropGroup,
        hoverClass: 'drophover'
      });
      var reduce = $('.head .reduce', selector);
      (reduce).hover(function() {
        $(this).addClass('ui-state-hover');
      },function() {
        $(this).removeClass('ui-state-hover');
      });
      reduce.click(onGroupReduceClick);
      
      $('.head .groupname', selector).each(function(){
        $(this).data('oldgroupname',$(this).text());
      });
      
      var groupid = string2groupid( $(selector).attr('id') );
      $('.head .groupname', selector).editable(onGroupNameEdit, {
        onblur: 'submit',
        select: true});
    };
    
    var bindAddGroupDropZone = function() {
      $('#contactList .addGroupDropZone').droppable({
        accept: '.contact',
        hoverClass: 'drophover',
        drop: onDropAddGroup
      });
    };
    
    var updateHeight = function() {
      var node = $('#contactList .dragContactContainment');
      if(!node[0])
        return;
      var height = Math.floor($(window).height()-node.offset().top);
      node.css('height', height+'px');
    };

    return {

      // Public //
      touchContact : getContact,
      touchGroup : getGroup,
      touchAvatar: touchAvatar,
      
      tpl_contact: tpl_contact,
      bindContact: bindContact,
      
      userid2string: userid2string,
      string2userid: string2userid,
      groupid2string: groupid2string,
      string2groupid: string2groupid,
      
      addContact: addContact,

      init: function() {
        // Fix jqueryui bug #4163 to force the cursor change on Chrome
        document.onselectstart = function () { return false; };
        $(document).bind('WindowManager.ready', function() {
          getAllContacts();
          updateHeight();
          $(window).resize(updateHeight);
        });
      }
    }
  }();

  $(document).ready(contacts.List.init);
  
}());
