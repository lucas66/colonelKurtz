
(function () {
    angular
      .module('app')
      .controller('MainController', MainController);


    /**
     * The MainController code.
     */
    function MainController($http, $log) {
        

        var item = this;

        // Properties
        item.id;
        item.title;
        item.img;
        item.desc;

        // Methods
        item.connect = connect;
        item.parseHTML = parseHTML;
        (function activate(){
            connect();
        })();
          function connect() {
            var request = {
                method: 'GET',
                url: 'data/web.json',
            };

            // Execute the HTTP request. 
            $http(request)
              .then(function (response) {
                  var root = response.data.web;
                  for (var i = 0; i < root.length; i++) {
                     item.id = root[i].id;
                     item.title = root[i].title;
                     item.img = root[i].img;
                     item.desc = root[i].desc;
                     parseHTML(item);
                  }
              }, function (error) {
                  console.log(error);
              });
        }
        function parseHTML (content){
            var contentItem = document.createElement('div');
            contentItem.className = "item left";
            
            var html = '<h3>' + content.title + '</h3>';
            html += '<p>' + content.desc + '</p>';
            html += '<img src="' + content.img + '" alt="' + content.title + '" />'
            console.log(content.id);
            console.log(content.title);
            console.log(content.img);
            console.log(content.desc);
            contentItem.innerHTML = html;
            document.getElementsByClassName('content')[0].appendChild(contentItem);
        }
        
    }
})();

