
define(function(){


    return function(globs){

        var _globs = globs;//we need this for border
        
        var _moved_distance = 5;//number of pixels the mouse has to move to consider it a properly moved mouse
        var _x,_y;
        
        var _start_x,_start_y,_end_x,_end_y;//to detect how far the click and drag is
        
        var _exclusive_subscriber;//id of the subscriber who is monopolizing the input
        
        var mousewheel_subscribed = [];
        var move_subscribed = [];
        var mouseup_subscribed = [];
        var mousedown_subscribed = [];
        
        // the object we're encapsulating
        var OBJ = {
          x: function (){return _x;},
          y: function (){return _y;}
        };

        //a subscriber can set this to true as a signal to this object to stop passing the message to the rest of the subscribers for the event
        OBJ.consumed_input = false;

        function set_position(e){
          
          var gameSpacePos = $('#canvasOne').offset();
          var canvas_x = e.pageX;
          var canvas_y = e.pageY;
          
          _x = (canvas_x - gameSpacePos.left)-_globs.border-_globs.margin.x;
          _y = (canvas_y - gameSpacePos.top)-_globs.border-_globs.margin.y;

        }
        
        //lowest to highest
        function dynamicSort(property) {
          return function (a,b) {
              return (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
          }
        }
        
        function any_subscribed(id){
          return (mousewheel_subscribed[id] || mouseup_subscribed[id] || move_subscribed[id] || mousedown_subscribed[id]);
        }

        OBJ.add_mousewheel_handler = function(id,level,handler) {
          mousewheel_subscribed[id] = {level: level,handler: handler};
        }

        OBJ.mousewheel_handler = function(event, delta, deltaX, deltaY) {

          if(_exclusive_subscriber != undefined){
            if(mousewheel_subscribed[_exclusive_subscriber] != undefined)
              mousewheel_subscribed[_exclusive_subscriber].handler(_x,_y,delta);
          } else {
            for(var handler in mousewheel_subscribed.sort(dynamicSort("level"))){
              var done = mousewheel_subscribed[handler].handler(_x,_y,delta);
              if(done){return;}
            }
          }
          OBJ.consumed_input = false;    
        }
        OBJ.remove_mousewheel_handler = function(id){
          if(mousewheel_subscribed[id]) {
            delete mousewheel_subscribed[id];
            if(_exclusive_subscriber == id) {
              if(any_subscribed(id)){
              } else {
                _exclusive_subscriber = undefined;
              }
            }
          }
        }

        OBJ.add_move_handler = function(id,level,handler) {
          move_subscribed[id] = {level: level,handler: handler};
        }

        OBJ.move_handler = function(e) {
           
          set_position(e);//sets _x and _y
          _end_x = _x;_end_y = _y;

          var dis_x = _start_x-_end_x;
          var dis_y = _start_y-_end_y;
          
          var stationary = Math.sqrt(dis_x*dis_x+dis_y*dis_y) < _moved_distance;
          
          //log(_x+":"+_y);
          if(_exclusive_subscriber != undefined){
            if(move_subscribed[_exclusive_subscriber] != undefined)
              move_subscribed[_exclusive_subscriber].handler(_x,_y,stationary);
          } else {
            for(var handler in move_subscribed.sort(dynamicSort("level"))){
              var done = move_subscribed[handler].handler(_x,_y,stationary);
              if(done){return;}
            }
          }
          OBJ.consumed_input = false;    
        }
        OBJ.remove_move_handler = function(id){
          if(move_subscribed[id]) {
            delete move_subscribed[id];
            if(_exclusive_subscriber == id) {
              if(any_subscribed(id)){
              } else {
                _exclusive_subscriber = undefined;
              }
            }
          }
        }
        
        OBJ.add_mouseup_handler = function(id,level,handler) {
          mouseup_subscribed[id] = {level: level,handler: handler};
        }
        
        OBJ.add_mousedown_handler = function(id,level,handler) {
          mousedown_subscribed[id] = {level: level,handler: handler};
        }
        
        OBJ.mousedown_handler = function(e) {
        
          set_position(e);
          _start_x = _x;_start_y = _y;
          _end_x = _x;_end_y = _y;
          
      //log("mousedown");
          if(_exclusive_subscriber != undefined){
            if(mousedown_subscribed[_exclusive_subscriber] != undefined)
              mousedown_subscribed[_exclusive_subscriber].handler();
      //log("ex mousedown handler:" + handler);
          } else {
            for(var handler in mousedown_subscribed.sort(dynamicSort("level"))){
              var done = mousedown_subscribed[handler].handler();
      //log("mousedown handler:" + handler);
              if(done){return;}
            }
          }
          OBJ.consumed_input = false;
        }
        
        OBJ.mouseup_handler = function() {
          //this._x
          //this._y

          var dis_x = _start_x-_end_x;
          var dis_y = _start_y-_end_y;
          
          var stationary = Math.sqrt(dis_x*dis_x+dis_y*dis_y) < _moved_distance;
          
          if(_exclusive_subscriber != undefined){
            if(mouseup_subscribed[_exclusive_subscriber] != undefined)
              mouseup_subscribed[_exclusive_subscriber].handler(stationary);
          } else {
            for(var handler in mouseup_subscribed.sort(dynamicSort("level"))){
              var done = mouseup_subscribed[handler].handler(stationary);
              if(done){return;}
            }
          }
          OBJ.consumed_input = false;    
        }
        
        OBJ.remove_mouseup_handler = function(id){
          if(mouseup_subscribed[id]) {
            delete mouseup_subscribed[id];
            if(_exclusive_subscriber == id) {
              if(any_subscribed(id)){
              } else {
                _exclusive_subscriber = undefined;
              }
            }
          }
        }
        
        OBJ.remove_mousedown_handler = function(id){
          if(mousedown_subscribed[id]) {
            delete mousedown_subscribed[id];
            if(_exclusive_subscriber == id) {
              if(any_subscribed(id)){
              } else {
                _exclusive_subscriber = undefined;
              }
            }
          }
        }
        
        OBJ.exclusive = function(id,setting){
          if(any_subscribed(id)){
            if(setting){
              _exclusive_subscriber = id;
            } else {
              if(id == _exclusive_subscriber)
                _exclusive_subscriber = undefined;
            }
          }
        }
        
        //set the handlers up
        $(document).bind("mousewheel.NAMESPACE",OBJ.mousewheel_handler);
        $(document).bind("mousemove.NAMESPACE",OBJ.move_handler);
        $(document).bind("mousedown.NAMESPACE",OBJ.mousedown_handler);
        $(document).bind("mouseup.NAMESPACE",OBJ.mouseup_handler);
        
        return OBJ;

    }

});
