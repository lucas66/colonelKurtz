/** 
 * Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See full license at the bottom of this file.
*/
var urlParameterExtraction = new (function () {
    function splitQueryString(queryStringFormattedString) {
        var split = queryStringFormattedString.split('&');

        // If there are no parameters in URL, do nothing.
        if (split == "") {
            return {};
        }

        var results = {};

        // If there are parameters in URL, extract key/value pairs. 
        for (var i = 0; i < split.length; ++i) {
            var p = split[i].split('=', 2);
            if (p.length == 1)
                results[p[0]] = "";
            else
                results[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
        }
        return results;
    }

    // Split the query string (after removing preceding '#'). 
    this.queryStringParameters = splitQueryString(window.location.hash.substr(1));
})();

// Extract token from urlParameterExtraction object.
var token = urlParameterExtraction.queryStringParameters['access_token'];
var userId = urlParameterExtraction.queryStringParameters['user_Id'];
if (token)
    localStorage.setItem('access_token', token);
if(userId)
    localStorage.setItem('user_id', userId);

(function activate() {
    if (localStorage.getItem('isButtonClicked') !== null) {
        if (document.location.search.length > 0) {
            var coded = document.location.search.split('&')[0].split('=')[1];
            $.ajax({
                type: 'POST',
                dataType: 'application/x-www-form-urlencoded',
                url: 'https://login.microsoftonline.com/common/oauth2/token',
                data: '{"grant_type=authorization_code&' +
                    'client_id=27048f63-7e2e-422d-b969-dee710e7a8a2&' +
                    'client_secret=ipKRsiozhqZUafkvXpO8XylokQbqe/6dl1vhmObwXvM&' +
                    'redirect_uri=http://localhost:8080&' +
                    'code=' + coded + '"}',

                //data: JSON.stringify({
                //    grant_type:'authorization_code',
                //    client_id: '27048f63-7e2e-422d-b969-dee710e7a8a2',
                //    client_secret:'ipKRsiozhqZUafkvXpO8XylokQbqe/6dl1vhmObwXvM',
                //    redirect_ur: 'http://localhost:8080&',
                //    code: coded,
                //    resource:'https://graph.microsoft.com'
                //}),
                success: function (data) {
                    console.log(data);
                },
                error: function (data) {
                    console.log(data);
                }

            });
        }
        if (localStorage.getItem('user_id') !== null) {

        }
        if (localStorage.getItem('access_token') !== null) {
            if (localStorage.getItem('user_id') !== null) {
                onAuthenticated();
            }
            else {
                connectToOneNote();

            }
        }
    }
 })();

function connect() {
    $('.crayola-popup').css('display', 'block');
      localStorage.setItem('isButtonClicked', document.location + 'click');

};
function hidePopup() {
    $('.crayola-popup').css('display', 'none');
}
function challengeForEnterpriseAuth() {
    $('.crayola-popup').css('display', 'none');
    if (localStorage.getItem('access_token') !== null && localStorage.getItem('user_id') !== null) {
        onAuthenticated();
    }
    else {
        var clientId = enterpriseClientId;
        var replyUrl = window.location;
        var resource = "https://graph.microsoft.com";

        var authServer = 'https://login.microsoftonline.com/common/oauth2/authorize';
        var responseType = 'code';

        var url = authServer +
                  "?response_type=" + encodeURI(responseType) +
                  "&client_id=" + encodeURI(clientId) +
                  //'&scope=office.onenote_create,Office.onenote,Office.onenote_update,Office.onenote_update_by_app&' +
                    '&resource=' + encodeURI(resource);
        window.location = url;
    }
}



function connectToOneNote() {

    getNotebooks();
};

function getNotebooks() {
    var request = {
        method: 'GET',
        url: 'https://graph.microsoft.com/beta/me/notes/notebooks',
    };

    // Execute the HTTP request. 
    $http(request)
      .then(function (response) {
          $log.debug('Found the users notebooks.', response);
          response.status === 202 ? vm.requestSuccess = true : vm.requestSuccess = false;
          vm.requestFinished = true;
          var root = response.data.value;
          vm.clpNotebookSelf = '';
          vm.isNotebookCreated = false;
          for (var i = 0; i < root.length; i++) {
              if (root[i].name.toLowerCase() == "crayola lesson plans") {
                  vm.isNotebookCreated = true;
                  vm.clpNotebookSelf = root[i].self;
              }
          }
          if (!vm.isNotebookCreated)
              createNotebook();
          else
              getSections();
      }, function (error) {
          console.log(error);
          $log.error('HTTP request to Microsoft Graph API failed.');
          vm.requestSuccess = false;
          vm.requestFinished = true;
      });
}
function getSections() {
    var getSecs = {
        method: 'GET',
        url: vm.clpNotebookSelf + '/sections',
    };

    // Execute the HTTP request. 
    $http(getSecs)
      .then(function (response) {
          $log.debug('Getting the notebook sections.', response);
          response.status === 202 ? vm.requestSuccess = true : vm.requestSuccess = false;
          vm.requestFinished = true;
          var root = response.data.value
          vm.isSectionCreated = false;
          for (var i = 0; i < root.length; i++) {
              if (root[i].name.toLowerCase() == "crayola lesson plans") {
                  vm.isSectionCreated = true;
                  vm.clpSectionSelf = root[i].self;
              }
          }
          if (!vm.isSectionCreated)
              createSection();
          else
              getPages();
      }, function (error) {
          console.log(error);
          $log.error('HTTP request to Microsoft Graph API failed.');
          vm.requestSuccess = false;
          vm.requestFinished = true;
      });

}
function getPages() {
    var getPgs = {
        method: 'GET',
        url: 'https://graph.microsoft.com/beta/me/notes/pages',
    };

    // Execute the HTTP request. 
    $http(getPgs)
      .then(function (response) {
          $log.debug('Getting the notebook pages.', response);
          response.status === 202 ? vm.requestSuccess = true : vm.requestSuccess = false;
          vm.requestFinished = true;
          var root = response.data.value;
          var isPageCreated = false;
          for (var i = 0; i < root.length; i++) {
              if (root[i].title.toLowerCase() == document.getElementsByTagName('h1')[0].innerHTML.toString().toLowerCase()) {
                  isPageCreated = true;
                  vm.clpPageId = root[i].id;
                  window.open(root[i].links.oneNoteWebUrl.href, '', 'width=1000');
                  localStorage.clear();
                  return;
              }
          }
          if (!isPageCreated)
              createPage();
      }, function (error) {
          console.log(error);
          $log.error('HTTP request to Microsoft Graph API failed.');
          vm.requestSuccess = false;
          vm.requestFinished = true;
      });

}
function createNotebook() {
    //create notebook
    var lessonPlanNotebook = {
        method: 'POST',
        //headers: {"Content-Type": "application/json"},
        url: 'https://graph.microsoft.com/beta/me/notes/notebooks',
        data: {
            "name": 'Crayola Lesson Plans'
        }

    };
    $http(lessonPlanNotebook).then(function (response) {
        $log.debug('Created the notebook: Crayola Lesson Plans.', response);
        response.status === 202 ? vm.requestSuccess = true : vm.requestSuccess = false;
        vm.requestFinished = true;
        vm.clpNotebookSelf = response.data.self;
        createSection();

    }, function (error) {
        $log.debug('note book creation failed.', error);
    });

}
function updateNotebook() {

}
function createSection() {
    var lessonPlanSection = {
        method: 'POST',
        //headers: {"Content-Type": "application/json"},
        url: vm.clpNotebookSelf + '/sections',
        data: {
            "name": 'Crayola Lesson Plans'
        }
    };
    $http(lessonPlanSection).then(function (response) {
        $log.debug('Created the section: Crayola Lesson Plans.', response);
        response.status === 202 ? vm.requestSuccess = true : vm.requestSuccess = false;
        vm.requestFinished = true;
        vm.clpSectionSelf = response.data.self;
        createPage();
    }, function (error) {
        $log.debug('section creation failed.', error);
    })
}
function createPage() {

    var srcImages = document.getElementsByTagName('img');
    for (var i = 0; i < srcImages.length; i++) {
        var srcImage = srcImages[i];

        // Create an empty canvas element
        var canvas = document.createElement("canvas");
        canvas.width = srcImage.width;
        canvas.height = srcImage.height;

        // Copy the image contents to the canvas
        var ctx = canvas.getContext("2d");
        ctx.drawImage(srcImage, 0, 0);

        // Get the data-URL formatted image
        // Firefox supports PNG and JPEG. You could check img.src to guess the
        // original format, but be aware the using "image/jpg" will re-encode the image.
        var dataURL = canvas.toDataURL("image/png");
        srcImage.src = dataURL;
    }
    var html = '<html><head><title>' + document.getElementsByTagName('h1')[0].innerHTML + '</title></head><body style="font-family:Arial, Helvetica, sans-serif" data-absolute-enabled="true">';
    //var html = '<div data-render-src="http://www.crayola.com/lesson-plans/americana-coasters-lesson-plan/" data-render-method="extract.recipe" data-render-fallback="render"></div>';
    html += parseHTML();
    html += '</bod></html>';

    //var data = dataURL.replace(/^data:image\/(png|jpg);base64,/, "");

    var page = {
        method: 'POST',
        headers: { "Content-Type": "application/xhtml+xml" },
        url: vm.clpSectionSelf + '/pages',
        data: html
    };
    $http(page).then(function (response) {
        $log.debug('Created the page', response);
        response.status === 202 ? vm.requestSuccess = true : vm.requestSuccess = false;
        vm.requestFinished = true;
        window.open(response.data.links.oneNoteWebUrl.href, '', 'width=1000');
        localStorage.clear();
    }, function (error) { $log.debug('page creation failed.', error); })
}

function parseHTML() {

    var pageHeight = document.getElementsByClassName('col-main')[0].offsetHeight;
    pageHeight = pageHeight - 290;

    //first td
    var html = '<div style="position:absolute; top:-10px; left:817px;"><img src="http://www.crayola.com/application/shop/images/logo-print.jpg" width=100 height=65 style="width:100px; height:65px;" /></div><table style="border:0; position:absolute; width:1200px:"><tr><td>';
    var title = '<h1 style="font-weight: 600;font-size: 35px;color: #198ac9;">' + document.getElementsByTagName('h1')[0].innerHTML + '</h1>';
    var intro = document.getElementsByClassName('intro')[0].innerHTML;
    var bigImg = document.getElementsByClassName('img-box')[0].innerHTML;

    html += title + intro + '<br />' + bigImg;

    //lists below img
    var infobar = document.getElementsByClassName('infobar')[0].getElementsByTagName('li');
    var ibTr = '<table style="width:600px;"><tr>';
    for (var k = 0; k < infobar.length; k++) {
        ibTr += '<td style="text-align:left;">' + infobar[k].innerHTML + '</td>';
    }
    ibTr += '</tr></table>';
    html += ibTr;

    var items = document.getElementsByClassName('items')[0].getElementsByTagName('li');
    var iUl = '<ul style="margin-bottom:20px">'
    for (var m = 0; m < items.length; m++) {
        if (items[m].parentNode.nodeName.toLowerCase() == 'ul') {
            var ulAnchor = '<h2>' + document.getElementsByClassName('items')[0].getElementsByTagName('li')[m].getElementsByTagName('a')[0].innerHTML + '</h2>';
            var slide = document.getElementsByClassName('items')[0].getElementsByTagName('li')[m].getElementsByTagName('div')[0].innerHTML;
            iUl += '<li style="list-style-type:none;margin-bottom:10px;">' + ulAnchor + slide + '</li>';
        }
    }
    iUl += '</ul>'

    html += iUl;
    html += '</td><td>';

    //right side td
    var boxSuppliesHeader = document.getElementsByClassName('box-supplies')[0].getElementsByTagName('h3')[0].innerHTML;
    var boxSuppliesList = document.getElementsByClassName('box-supplies')[0].getElementsByTagName('li');
    var bsLi = '<ul>'
    for (var i = 0; i < boxSuppliesList.length; i++) {
        bsLi += '<li style="margin-left:0; margin-right:0;">' + boxSuppliesList[i].innerHTML + '</li>';
    }
    bsLi += '</ul>';

    html += '<table style="border:0; background-color:#cee6f4;"><tr><td style="width:5px;"></td><td style="color:#198ac9; font-size:18px; width:396px;">' + boxSuppliesHeader + '</td><td style="width:5px;"></td></tr><tr><td style="width:5px;"></td><td>' + bsLi + '</td><td style="width:5px;"></td></tr></table>';

    var boxTagsHeader = '<h3 style="color: #8c847c; margin-top:10px;">' + document.getElementsByClassName('box-tags')[0].getElementsByTagName('h3')[0].innerHTML.toString().toUpperCase() + '</h3>';
    var boxTagsSubHeader = document.getElementsByClassName('box-tags')[0].getElementsByTagName('h4');
    var boxTagsList = document.getElementsByClassName('box-tags')[0].getElementsByTagName('ul');
    var sectBox = document.getElementsByClassName('box-tags')[0].innerHTML;
    var boxTags = '';
    for (var l = 0; l < boxTagsSubHeader.length; l++) {
        var h4 = '<h4 style="color: #8c847c; font-style:normal; font-size: 14px; margin-top:10px;">' + boxTagsSubHeader[l].innerHTML + '</h4>';
        var li = boxTagsList[l].getElementsByTagName('li');
        var btLi = '';
        for (var n = 0; n < li.length; n++) {
            btLi += '<p>' + li[n].innerHTML + '</p>';
        }
        boxTags += h4 + btLi;
    }


    html += '<table class="box-tags" style="border:0; margin-top: 20px; background-color:#e9e6e3; color: #8c847c; font-size:14px;"><tr><td style="width:5px;"></td><<td style="width:396px;">' + boxTagsHeader + boxTags + '</td><td style="width:5px;"></td></tr></table></td></tr></table>';

    html += '<table style="border:0; width:1200px; margin-top:100px;"><tr><td style="background-color:#ea1b21; height:80px;"></td>' +
        '<td style="background-color:#f68a1e; height:80px;"></td>' +
        '<td style="background-color:#ffed03; height:80px;"></td>' +
        '<td style="background-color:#c5d63a; height:80px;"></td>' +
        '<td style="background-color:#00a64e; height:80px;"></td>' +
        '<td style="background-color:#0074b3; height:80px;"></td>' +
        '<td style="background-color:#eb008b; height:80px;"></td>' +
        '<td style="background-color:#a04394; height:80px;"></td></tr></table><div style="position:absolute; top:' + pageHeight + 'px; left:577px;"><img src="http://www.crayola.com/application/shop/images/logo-print.jpg" width=100 height=65 style="width:100px; height:65px;" /></div>';

    return html;
}

function odauth(wasClicked) {
    vm.showPopup = false;
    if (localStorage.getItem('access_token')) {
        onAuthenticated(token);
    }
    else
        challengeForAuth();
}

function onAuthenticated() {
    var vmt = localStorage.getItem("access_token");

    if (vmt) {
        var request = {
            method: 'GET',
            url: 'https://www.onenote.com/api/v1.0/me/notes/notebooks',
            headers: { "Authorization": 'Bearer ' + vmt },
        };

        $http(request).then(function (response) {
            $log.debug('Found the users notebooks.', response);
            response.status === 202 ? vm.requestSuccess = true : vm.requestSuccess = false;
            vm.requestFinished = true;
            var root = response.data.value;
            vm.clpNotebookSelf = '';
            vm.isNotebookCreated = false;
            for (var i = 0; i < root.length; i++) {
                if (root[i].name.toLowerCase() == "crayola lesson plans") {
                    vm.isNotebookCreated = true;
                    vm.clpNotebookSelf = root[i].self;
                }
            }
            if (!vm.isNotebookCreated) {
                createConsumerNotebook();
            }
            else
                getConsumerSections();
        }, function (error) {
            console.log(error);
            $log.error('HTTP request to OneNote Consumer API failed.');
            vm.requestSuccess = false;
            vm.requestFinished = true;
        });

    }
    else {
        console.log("Error signing in");
    }
}

function getConsumerNotebooks() {
    var vmt = localStorage.getItem("access_token");
    var request = {
        method: 'GET',
        url: 'https://www.onenote.com/api/v1.0/me/notes/notebooks',
        headers: { "Authorization": 'Bearer ' + vmt },
    };

    // Execute the HTTP request. 
    $http(request)
      .then(function (response) {
          $log.debug('Found the users notebooks.', response);
          response.status === 202 ? vm.requestSuccess = true : vm.requestSuccess = false;
          vm.requestFinished = true;
          var root = response.data.value;
          vm.clpNotebookSelf = '';
          vm.isNotebookCreated = false;
          for (var i = 0; i < root.length; i++) {
              if (root[i].name.toLowerCase() == "crayola lesson plans") {
                  vm.isNotebookCreated = true;
                  vm.clpNotebookSelf = root[i].self;
              }
          }
          if (!vm.isNotebookCreated)
              createConsumerNotebook();
          else
              getConsumerSections();
      }, function (error) {
          console.log(error);
          $log.error('HTTP request to OneNote Consumer API failed.');
          vm.requestSuccess = false;
          vm.requestFinished = true;
      });
}
function getConsumerSections() {
    var vmt = localStorage.getItem("access_token");
    var getSecs = {
        method: 'GET',
        url: vm.clpNotebookSelf + '/sections',
        headers: { "Authorization": 'Bearer ' + vmt },
    };

    // Execute the HTTP request. 
    $http(getSecs)
      .then(function (response) {
          $log.debug('Getting the notebook sections.', response);
          response.status === 202 ? vm.requestSuccess = true : vm.requestSuccess = false;
          vm.requestFinished = true;
          var root = response.data.value
          vm.isSectionCreated = false;
          for (var i = 0; i < root.length; i++) {
              if (root[i].name.toLowerCase() == "crayola lesson plans") {
                  vm.isSectionCreated = true;
                  vm.clpSectionSelf = root[i].self;
              }
          }
          if (!vm.isSectionCreated)
              createConsumerSection();
          else
              getConsumerPages();
      }, function (error) {
          console.log(error);
          $log.error('HTTP request to OneNote Consumer API failed.');
          vm.requestSuccess = false;
          vm.requestFinished = true;
      });

}
function getConsumerPages() {
    var vmt = localStorage.getItem("access_token");
    var getPgs = {
        method: 'GET',
        url: 'https://www.onenote.com/api/v1.0/me/notes/pages',
        headers: { "Authorization": 'Bearer ' + vmt },
    };

    // Execute the HTTP request. 
    $http(getPgs)
      .then(function (response) {
          $log.debug('Getting the notebook pages.', response);
          response.status === 202 ? vm.requestSuccess = true : vm.requestSuccess = false;
          vm.requestFinished = true;
          var root = response.data.value;
          var isPageCreated = false;
          for (var i = 0; i < root.length; i++) {
              if (root[i].title.toLowerCase() == document.getElementsByTagName('h1')[0].innerHTML.toString().toLowerCase()) {
                  isPageCreated = true;
                  vm.clpPageId = root[i].id;
                  window.open(root[i].links.oneNoteWebUrl.href, '', 'width=1000');
                  localStorage.clear();
                  return;
              }
          }
          if (!isPageCreated)
              createConsumerPage();
      }, function (error) {
          console.log(error);
          $log.error('HTTP request to OneNote Consumer API failed.');
          vm.requestSuccess = false;
          vm.requestFinished = true;
      });

}
function createConsumerNotebook() {
    var vmt = localStorage.getItem("access_token");
    //create notebook
    var lessonPlanNotebook = {
        method: 'POST',
        //headers: {"Content-Type": "application/json"},
        url: 'https://www.onenote.com/api/v1.0/me/notes/notebooks',
        headers: { "Authorization": 'Bearer ' + vmt },
        data: {
            "name": 'Crayola Lesson Plans'
        }

    };
    $http(lessonPlanNotebook).then(function (response) {
        $log.debug('Created the notebook: Crayola Lesson Plans.', response);
        response.status === 202 ? vm.requestSuccess = true : vm.requestSuccess = false;
        vm.requestFinished = true;
        vm.clpNotebookSelf = response.data.self;
        createConsumerSection();

    }, function (error) {
        $log.debug('note book creation failed.', error);
    });

}

function createConsumerSection() {
    var vmt = localStorage.getItem("access_token");
    var lessonPlanSection = {
        method: 'POST',
        headers: { "Authorization": 'Bearer ' + vmt },
        //headers: {"Content-Type": "application/json"},
        url: vm.clpNotebookSelf + '/sections',
        data: {
            "name": 'Crayola Lesson Plans'
        }
    };
    $http(lessonPlanSection).then(function (response) {
        $log.debug('Created the section: Crayola Lesson Plans.', response);
        response.status === 202 ? vm.requestSuccess = true : vm.requestSuccess = false;
        vm.requestFinished = true;
        vm.clpSectionSelf = response.data.self;
        createConsumerPage();
    }, function (error) {
        $log.debug('section creation failed.', error);
    })
}
function createConsumerPage() {

    var srcImages = document.getElementsByTagName('img');
    for (var i = 0; i < srcImages.length; i++) {
        var srcImage = srcImages[i];

        // Create an empty canvas element
        var canvas = document.createElement("canvas");
        canvas.width = srcImage.width;
        canvas.height = srcImage.height;

        // Copy the image contents to the canvas
        var ctx = canvas.getContext("2d");
        ctx.drawImage(srcImage, 0, 0);

        // Get the data-URL formatted image
        // Firefox supports PNG and JPEG. You could check img.src to guess the
        // original format, but be aware the using "image/jpg" will re-encode the image.
        var dataURL = canvas.toDataURL("image/png");
        srcImage.src = dataURL;
    }
    var html = '<html><head><title>' + document.getElementsByTagName('h1')[0].innerHTML + '</title></head><body style="font-family:Arial, Helvetica, sans-serif" data-absolute-enabled="true">';
    //var html = '<div data-render-src="http://www.crayola.com/lesson-plans/americana-coasters-lesson-plan/" data-render-method="extract.recipe" data-render-fallback="render"></div>';
    html += parseHTML();
    html += '</bod></html>';

    //var data = dataURL.replace(/^data:image\/(png|jpg);base64,/, "");
    var vmt = localStorage.getItem("access_token");
    var page = {
        method: 'POST',
        headers: {
            "Authorization": 'Bearer ' + vmt,
            "Content-Type": "application/xhtml+xml"
        },
        url: vm.clpSectionSelf + '/pages',
        data: html
    };
    $http(page).then(function (response) {
        $log.debug('Created the page', response);
        response.status === 202 ? vm.requestSuccess = true : vm.requestSuccess = false;
        vm.requestFinished = true;
        window.open(response.data.links.oneNoteWebUrl.href, '', 'width=1000');
        localStorage.clear();
    }, function (error) { $log.debug('page creation failed.', error); })
}


function challengeForAuth() {
    var clientId = consumerApplicationId;
    var replyUrl = window.location;
    var endpointUrl = 'http://api.onedrive.com/v1.0/drive/root';
    var resource = "http://api.onedrive.com";

    var authServer = 'https://login.live.com/oauth20_authorize.srf';
    var responseType = 'token';

    var url = authServer +
              "?response_type=" + encodeURI(responseType) + "&" +
              "client_id=" + encodeURI(clientId) + "&" +
              '&scope=office.onenote_create,Office.onenote,Office.onenote_update,Office.onenote_update_by_app&' +
              "redirect_uri=" + encodeURI(replyUrl);

    window.location = url;
}






