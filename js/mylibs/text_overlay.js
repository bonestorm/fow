
define(function(){

    return function(globs){

        var _globs = globs;//we need this for border

        // the object we're encapsulating
        var OBJ = {
          snippets: {},
          last_id: 0,
          parent_div: $("#text_overlay"),
          width: 1124, height: 1068
        };

        //all snippets are in relation to the translation
        OBJ.translate = function(tx,ty){
          OBJ.tx = tx;
          OBJ.ty = ty;
          var div_ids = Object.keys(OBJ.snippets);
          for(var i in div_ids){
            OBJ.place(div_ids[i]);
          }
        }

        OBJ.place = function(div_id){
      /*
          new_div.css({
            left: (_globs.margin.x+_globs.border+left+(OBJ.width/2))+'px', top: (_globs.margin.y+_globs.border+top)+'px'
          });
      */
          OBJ.snippets[div_id].div.css({
            left: (OBJ.tx+OBJ.snippets[div_id].x)+'px', top: (OBJ.ty+OBJ.snippets[div_id].y)+'px'
          });
        }

        OBJ.add_text = function(text, left, top, width, height, options) {
          
          OBJ.last_id++;
          var new_id = OBJ.last_id;
          var div_id = "texover_"+new_id;

          OBJ.parent_div.append("<div id='"+div_id+"'>"+text+"</div>");
          
          var new_div = $("#"+div_id);
          //new_div.addClass('unselectable');//we don't want them interacting with the text

          OBJ.snippets[div_id] = {div_id: div_id,id: new_id, div: new_div, x: left, y: top};
          
          
          new_div.css({
            position: 'absolute',overflow: 'hidden',
            width: width+'px', height: height+'px',      
          });
          OBJ.place(div_id);

          /*
          new_div.css('position','relative');
          new_div.css('left',(_globs.border+left)+'px');
          new_div.css('top',(_globs.border+top)+'px');
          new_div.css('width',width+'px');
          new_div.css('height',height+'px');
          new_div.css('overflow','hidden');
          */
          
          /*
          new_div.css('border-color','red');
          new_div.css('border-style','solid');
          new_div.css('border-width','1px');
          */
          
          
          return OBJ.snippets[div_id];
          
        }
        
        OBJ.delete_text = function(div_id) {
          try {
            if(OBJ.snippets[div_id] == undefined)
              throw "undefined";
            
            OBJ.snippets[div_id].div.remove();      
            delete OBJ.snippets[div_id];

          } catch(er){
            if(er == "undefined")
              alert("trying to delete the undefined text id: "+div_id);
          }
        }
        
        return OBJ;

    };

});
