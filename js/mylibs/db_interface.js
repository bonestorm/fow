
define(['table','join'],function(TABLE,JOIN){

    return function(globs){

        var _globs = globs; 

        var ajax_load = $("<div style='margin:350px auto;width: 32px;'><img src='img/load3.gif' alt='loading...' /></div>");

        var OBJ = {

            ajax_load: ajax_load,
            call_stack: [],

            db_interface_link: "/ajax",
            databases: [],
            objects: [],
            fields: [],
            joins: []
        };

        OBJ.set_databases = function(databases){
            OBJ.databases = databases.slice();
        }

        OBJ.get_current_database = function(){ return _globs.slist.picked_database; }
        OBJ.get_current_objects = function(){
          var db = OBJ.get_current_database();
          if(OBJ.objects[db] === undefined){
            OBJ.objects[db] = {grid_info: {},table_ids: {}};
          }
          return OBJ.objects[db];
        }


        //data comes back from the server as a big array of arrays.
        //we need hash with object id keys for 'grid_info' and a hash of table object name keys and id values for 'table_ids'
        OBJ.process_loaded_objects = function(raw_data){
            var objs = OBJ.get_current_objects();

            //copy table ids
            var raw_table = raw_data.table_ids;
            objs.table_ids = $.extend({},raw_table);

            //copy and process grid info
            var raw_grid = raw_data.grid_info;
            for(var i in raw_grid){
                objs.grid_info[raw_grid[i].id] = $.extend({},raw_grid[i]);
                delete objs.grid_info[raw_grid[i].id].id;//we don't need the id since it's the key now

/*
                //done on server side now
                if(raw_grid[i].type == "TABLE"){//if it's a table then we need to be able to look up its id by its name
                  objs.table_ids[raw_grid[i].name] = raw_grid[i].id;
                }
*/

            }


        }

        OBJ.set_database_objects = function(raw_data){
            var database = OBJ.get_current_database();
            if($.inArray(database,OBJ.databases) != -1){
              if(raw_data === undefined){//if object is null then delete existing one
                delete OBJ.objects[database];
              } else {
                OBJ.process_loaded_objects(raw_data);
              }
            } else {
              alert("no database " + database + " in database info");
            }
        }

        OBJ.set_table_fields = function(database,table,fields){
//console.log("DB: "+database);
//console.log("TABLE: "+table);
//console.log("FIELDS: ");
//console.log(fields);
            if($.inArray(database,OBJ.databases) != -1){
              if(OBJ.fields === undefined){OBJ.fields = [];}
              if(OBJ.fields[database] === undefined){OBJ.fields[database] = [];}
              if(OBJ.fields[database][table] === undefined){OBJ.fields[database][table] = [];}//autovivification
              if(fields === undefined){//if fields is null then delete existing one
                delete OBJ.fields[database][table];
              } else {
                OBJ.fields[database][table] = fields;//a list of field objects
              }
            } else {
              alert("no database " + database + " in database info");
            }
        }

        OBJ.set_database_joins = function(database,joins){
            if($.inArray(database,OBJ.databases) != -1){
              if(joins === undefined){//if tables is null then delete existing one
                delete OBJ.joins[database];
              } else {
                OBJ.joins[database] = tables;//a list of join objects
              }
            } else {
              alert("no database " + database + " in database info");
            }
        }

        //creates all the grid objects that are in the retrieved data for the current database
        OBJ.spawn_grid = function(){

            var obj_added = false;//returns true if at least one objects is added

            var objs = OBJ.get_current_objects();

            //order the object creation by type so all tables are added before links
            var type_scores = {TABLE: 3,COMMENT: 2,JOIN: 1};
            var gids = Object.keys(objs.grid_info).sort(function(a,b){
              var at = objs.grid_info[a]['type'];
              var bt = objs.grid_info[b]['type'];
              at = (type_scores[at] !== undefined) ? type_scores[at] : -1;
              bt = (type_scores[bt] !== undefined) ? type_scores[bt] : -1;
              return (bt-at);
            });;
            

            for(var gid in gids){//objs.grid_info){
              
              var id = gids[gid];
              var obj = objs.grid_info[id];

              //var obj = objs.grid_info[id];
              var new_obj;

              if(obj.type == "TABLE"){
                //makes its own width even though it is provided. should i allow it to be set here?
                new_obj = new TABLE(_globs,{cx:parseInt(obj.x),cy:parseInt(obj.y),db_id: id,name: obj.name});
              }
              if(obj.type == "JOIN"){
                new_obj = new JOIN(_globs,{cx:parseInt(obj.x),cy:parseInt(obj.y),db_id: id,
                  leads: eval(obj.leads),
                  lead_start: eval(obj.lead_start),
                  table_from_id: obj.table_from_id,
                  field_from: obj.field_from,
                  table_to_id: obj.table_to_id,
                  field_to: obj.field_to
                });
              }
              if(obj.type == "COMMENT"){
              }
              if(new_obj.error !== undefined && new_obj.error){
                alert("Error creating a new object in the grid:" + new_obj.error);
              } else {
                _globs.grid.add_obj(new_obj,false);//send it false to tell it to not bother with neighbor notification
                obj_added = true;
              }
            }

            return obj_added;

        }


        OBJ.call = function(callback,data){

/*

getDatabaseNames: gets names of all the databases in dbag.table_schema
passed in:  ['action' => 'getDatabaseNames']
results:    ['action' => 'getDatabaseNames', 'data' => ['database1','database2','database3'....


getTableIds: gets names of all the tables in the selected database
passed in:  ['action' => 'getTableIds', 'database' => 'database_name']
results:    ['action' => 'getTableIds', 'database' => 'database_name', 'data' => ['table1' => '<table1_id> or -1 if table not placed in grid,'table2' => '<table2_id or -1...

getAllObjects: (getTableIds is calle implicitely and its results are added to table_info, giving any tables not placed a '-1' value)
passed in:  ['action' => 'getAllObjects', 'database' => 'database_name']
results:    ['action' => 'getAllObjects', 'database' => 'database_name', 
  'data' => [
    grid_info: ['id' => 60, 'type' => 'TABLE','x' => 12,'y' => 23...],['id' => 70, 'type' => 'JOIN'....]
    table_info: ['table1' => '<table1_id> or -1 if table not placed in grid,'table2' => '<table2_id or -1...]
  ] 
]   
    
        
getTableFields: gets information about a table (or tables)
passed in:  ['action' => 'getTableFields', 'database' => 'database_name', 'data' => ['table_one','table_two','table_three']]
results:    ['action' => 'getTableFields', 'database' => 'database_name', 'data' => ['table_one' => ['field_one' => ['data_type' => 'int(11)','nullable' => true],'field_two' => ['data_type......       
            
        
saveObject: (value of returned 'inserted' and 'updated' field is the id of the grid object)
if there is no 'id' then it will insert
passed in:  ['action' => 'saveObject', 'data' => ['type' => 'TABLE','x' => 12,'y' => 23...]]
results:    ['action' => 'inserted', 'id' => 60]
if there IS an 'id' then it will update
passed in:  ['action' => 'saveObject', 'data' => ['id' => 60, 'type' => 'TABLE','x' => 12,'y' => 23...]]
results:    ['action' => 'updated', 'id' => 60]
        
deleteObject:
passed in:  ['action' => 'deleteObject', 'id' => 23]
results:    ['action' => 'deleted', 'id' => 23] 

*/

            function ajax_call(){
//console.log(OBJ.call_stack[0].data);

              $.ajax({
                type: 'POST',
                url: OBJ.db_interface_link,
                async: true,
                dataType: 'json',
                data: {stack: [OBJ.call_stack[0].data]},
                success: function(ret_stack) {

//console.log("RET STACK");
//console.log(ret_stack);

                  var req = OBJ.call_stack[0].data;//passed in data
                  var req_action = req.action;

                  var ret = ret_stack[0];//only single row stacks for now
                  var action = ret.action;

                  var objs = OBJ.get_current_objects();
          
 
                  if(req_action == "saveObject"){

                    var id = ret.id;

                    //table object insert so add it to table_ids
                    if(req.data.name !== undefined){ objs.table_ids[req.data.name] = id; }

                    if(objs.grid_info[id] === undefined){objs.grid_info[id] = {};}
                    for(var i in req.data){
                        objs.grid_info[id][i] = (i == "leads") ? eval(req.data[i]) : req.data[i];
                    }

                  }

                  if(req_action == "deleteObject"){

                    var id = ret.id;

                    if(objs.grid_info[id] !== undefined){
                      var gi = objs.grid_info[id];
                      if(gi.type.match(/TABLE/i) && objs.table_ids[gi.name] !== undefined){
                        objs.table_ids[gi.name] = -1;
                      }
                      delete objs.grid_info[id];
                    }
                  }

                  var callback_data = (ret.data !== undefined) ? ret.data : ret.id;

                  if(OBJ.call_stack[0].callback !== undefined){OBJ.call_stack[0].callback(callback_data);}

                  OBJ.call_stack.shift();//remove this call

                  if(OBJ.call_stack.length == 0){
                    OBJ.ajax_load.remove();
                  } else {
                    ajax_call();
                  }
                }

              });
            }

            //pre processing for the call information
            //in the array passed for the call there are 2 important fields to keep on the main level: 'action' and 'database'
            //all other fields are bundled up and put in 'data'
            var call_info = $.extend({},data);
            for(var i in call_info){
              if(i != "action" && i != "database" && i != "data"){
                if(call_info.data === undefined){call_info.data = {};}
                call_info.data[i] = call_info[i];
                delete call_info[i];
              }
            }

            OBJ.call_stack.push({callback:callback,data:call_info});

            if(OBJ.call_stack.length == 1){//start up the chain
              $("#text_overlay").append(OBJ.ajax_load);//notify that it's processing
              ajax_call();//rev up the chain
            }

        }


        OBJ.load = function(callback){

            function db_info_loaded(raw_data){

                //takes the raw data from the server and processes it for use
                OBJ.set_database_objects(raw_data);//add it to db_info

                //reset the grid
                _globs.grid.reset();

                //load all the objects
                if(OBJ.spawn_grid()){
                  _globs.refresh();
                }

                if(callback !== undefined){callback();}

            }

            OBJ.call(db_info_loaded,{action: "getAllObjects", database: OBJ.get_current_database()});//load in all the objects for this database              

        }

        OBJ.load_table_fields = function(tables,callback){
            function db_info_loaded(objects){
              for(var table_name in objects){
                  OBJ.set_table_fields(OBJ.get_current_database(),table_name,objects[table_name]);
              }
              if(callback !== undefined){callback();}
            }
            OBJ.call(db_info_loaded,{action: "getTableFields", database: OBJ.get_current_database(), data: tables});
        }

        return OBJ;
    }

});
