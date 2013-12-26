
var w = 1100,
h = 1200,
node,
link,
root = [];

var force = d3.layout.force()
  //.on("tick", tick)
  .size([w, h])
  .charge(function(d){
    if(d.type == "category"){
      return "-5000";
    }
    else if(d.type == "root"){
      return "-10000";
    }
    else{
      return "-200";
    }
  })
  .gravity(.55)
  .friction(.3);

  var vis = d3.select("#chart").append("svg:svg")
  .attr("width", w)
  .attr("height", h);

  var children = [];

  var currentCreatedAt,thisCreatedAt;


  var categoryNames = ["Transportation","Business","City Government","Education","Environment","Health","Housing & Development","Public Safety","Recreation","Social Services"];

  var objectArrays = [[],[],[],[],[],[],[],[],[],[]];

  var topLevelTables = [];

  for(i=0;i<categoryNames.length;i++){
    objectArrays[i].name = categoryNames[i];

  }

  var baseCount = 0;
  var modCount = 0;

  var json2;


  //d3.json("http://data.cityofnewyork.us/resource/tdsx-cvye.json", function(json) {
    //d3.json("sets.json", function(json) {
      d3.json("http://data.cityofnewyork.us/resource/tdsx-cvye.json?$Select=system_id,type,description,name,created_at,updated_at,category,table_id,owner,attribution,keywords",function(json1) {

      d3.json("http://data.cityofnewyork.us/resource/tdsx-cvye.json?$Select=system_id,type,description,name,created_at,updated_at,category,table_id,owner,attribution,keywords&$offset=1000",function(json2) {

      d3.json("http://data.cityofnewyork.us/resource/tdsx-cvye.json?$Select=system_id,type,description,name,created_at,updated_at,category,table_id,owner,attribution,keywords&$offset=2000",function(json3) {


       
        var json = json1.concat(json2);
        json = json.concat(json3);
    


        for (var i=0; i<json.length; i++){

          json[i].type = typeParse(json[i].type);


      //call function to get id for Text in Category Field

      j = getCategoryId(json[i].category);
      if(j==undefined) continue;


      if(json[i].type == "Tabular"){  //only get the tabular data.  Turns out filtered views have a type of Tabular, Groupings have a type of "Filter", weird.  

      //Need to see if tableId exists in topLevelTables.  If not, add it. If so, check which one is older using "createdAt", keep older one
        if(json[i].category){ //there are some with no category that were messing things up

         // if (json[i].table_id == 908693){
          //  console.log(json[i].table_id);
          //}

        //check topLevelTables to see if the table_id is in there
        var l = topLevelTables.indexOf(json[i].table_id);
        if(l<0){ //if not there, add it.

          //console.log("There is no top level table with id " + json[i].table_id);
          
          objectArrays[j].push(json[i]);
          topLevelTables.push(json[i].table_id);
          baseCount++  //tabulate top level datasets
        }
        else{ //if it is there, compare our createdAt

         
          matchId = topLevelTables[l];
         
          currentCreatedAt;
          thisCreatedAt = json[i].created_at;
        
          var matchMarker;

            for(k=0;k<objectArrays[j].length;k++){ //loop through category to find our match
              //console.log(objectArrays[j][k].table_id + " " + matchId);

              if (objectArrays[j][k].table_id == matchId){
                
                currentCreatedAt = objectArrays[j][k].created_at;
               
                matchMarker = k;

              }
            }


            if(currentCreatedAt<thisCreatedAt){ //if current is older, do nothing


            }
            else { //if new is older, delete old one and push new one.

            
                //deletes old one and flags it
                objectArrays[j].splice(matchMarker,1);
                //TODO add flag

                //pushes new one
                objectArrays[j].push(json[i]);
                
                


              }



            }
          }

        }

        else{
          json[i].flag = 1;
        }

      }


    //we iterated through all of the datasets once and grabbed all that are tabular
    //for non-tabular, we will reference their table_id against all of the tabular ones
    //if there's a match, make it a child, if not, append it to root of the category.  This should be fun.

    //first only work on the ones we flagged in the above loop
    for (var i=0; i<json.length; i++){
      if(json[i].flag == 1){
        var j = topLevelTables.indexOf(json[i].table_id);
        if(json[i].category){
          k = getCategoryId(json[i].category);
            if (j<0){ //if it's not there, append to root of category

              json[i].flag = 0;
            objectArrays[k].push(json[i]);
            baseCount++;

          }
            else{ //make it a child of the one you found
              parentTableId = topLevelTables[j];
                //we have the id, now lop through the category until we find a match
                
                for(m=0;m<objectArrays[k].length;m++){
                  if (objectArrays[k][m].table_id==parentTableId){
                    if(!objectArrays[k][m].children){
                      objectArrays[k][m].children=[];
                    }
                    objectArrays[k][m].children.push(json[i]);
                    modCount++;
                  }

                }
                
              }




            }
          }
        }




        root.name = "NYC";
        root.type = "root";
        var categoryArr = [];

        for(i=0;i<categoryNames.length;i++){
          o = new Object();
          o.name = categoryNames[i];
          o.children = objectArrays[i];
          ;      o.type = "category";
          categoryArr.push(o);

        }


        root.children = categoryArr;



        var nodes = flatten(root),
        links = d3.layout.tree().links(nodes);


  // Restart the force layout.
  force
  .nodes(nodes)
  .links(links);

  force.start();
  for (var i = 300; i > 0; --i) force.tick();
  
    force.stop();

  // Update the links…
  link = vis.selectAll("line.link")
  .data(links, function(d) { return d.target.id; });

  // Enter any new links.
  link.enter().insert("svg:line", ".node")
  .attr("class", "link")
  .attr("x1", function(d) { return d.source.x; })
  .attr("y1", function(d) { return d.source.y; })
  .attr("x2", function(d) { return d.target.x; })
  .attr("y2", function(d) { return d.target.y; });

  // Exit any old links.
  link.exit().remove();

  // Update the nodes…
  node = vis.selectAll(".node")
  .data(nodes, function(d) { return d.id; })
  .enter().append("g")
  .attr("class",function(d){
    if(d.type=="root") return "root"
      else return "node"
    })
  //.call(force.drag)
  .on("click",function(d){
    //console.log(d);
    //open link in new tab
    var url = "http://nycopendata.socrata.com/" + d.name.url; 
    window.open(url, "_blank");

  })
  //.call(force.drag)
  .on("mouseover",function(d){

    //d3.select(d3.event.target).classed("highlight", true);

    if(d.type=="category"){
      document.getElementById("lname").innerHTML = "Category: " + d.name;
      clearLegend();
    }
    else if(d.type=="root"){
      document.getElementById("lname").innerHTML = "NYC Open Data";
      clearLegend();
    }
    else{

      document.getElementById("lname").innerHTML = d.name.description + "<img src = " + getTypeIcon(d.type) + " class = 'legendIcon'>";
      document.getElementById("ldescription").innerHTML = truncate(d.description);
      document.getElementById("lowner").innerHTML = "<span class = 'miniBlue'>Owner: </span>" + d.owner.description;
      document.getElementById("lattribution").innerHTML = "<span class = 'miniBlue'>Attribution: </span>" + d.attribution.description;
      document.getElementById("lcreated").innerHTML = "<span class = 'miniBlue'>Created on </span>" + timeConverter(d.created_at);
      document.getElementById("lupdated").innerHTML = "<span class = 'miniBlue'>Updated on </span>" + timeConverter(d.updated_at);
    }
  })
.on("mouseout",function(d){
  //d3.select(d3.event.target).classed("highlight", false);
});


  // Enter any new nodes.
  node.append("svg:circle")
  //.attr("class", "node")
  //.attr("cx", function(d) { return d.x; })
  //.attr("cy", function(d) { return d.y; })

  .attr("r", function(d){
    if (d.type=="category"){

      return "25px";
    }

    else if(d.type == "root"){
      return "45px";
    }

    else{
      return "7px";
    }
  })
  .attr("class",function(d){
    if(d.flag == 1){
      return "view";
    }
    if(d.type == "category"){
      return "maincircle";
    }
    if(d.type == "root"){
      return "maincircle";
    }
    else{
      return "node";
    }
  })
  //.on("click", click)
  ;

  node.append("svg:image")
  .attr("xlink:href", function(d){
    if (d.type=="category"){
     
      c = getCategoryId(d.name);
      c = "img/cat" + c + ".png"
      return c;
    }

    c = getTypeIcon(d.type);
    return c;

  })
  .attr("x", function(d){
    if(d.type == "category"){return "-15px"}
      else {return "-4px"}
    })
  .attr("y", function(d){
    if(d.type == "category"){return "-15px"}
      else {return "-4px"}
    })
  .attr("height",function(d){
    if(d.type == "category"){return "30px"}
      else {return "8px"}
    })
  .attr("width",function(d){
    if(d.type == "category"){return "30px"}
      else {return "8px"}
    })
  .attr("class","nodeimg");


  node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

  r = vis.selectAll(".root");

  r.append('text')
  .text("NYC")
  .attr("y", "-12px")
  .attr("class","centertextbold");

  r.append('text')
  .text("Open")
  .attr("y", "10px")
  .attr("class","centertext");

  r.append('text')
  .text("Data")
  .attr("y", "32px")
  .attr("class","centertext");

  


  console.log("Basecount: " + baseCount);
  console.log("Views: " + modCount);


 $('#loading').fadeOut('slow', function() {});
 $('#chart').fadeIn('slow', function() {});
 $('#legend').fadeIn('slow', function() {});
 $('#headerouter').fadeIn('slow', function() {});


});
});
});

$( "#about" ).click(function() {
  $('#aboutbox').fadeIn('slow',function(){});
});

$( ".closex" ).click(function() {
  $('#aboutbox').fadeOut('slow',function(){});
});


function clearLegend(){
  document.getElementById("ldescription").innerHTML = "";
  document.getElementById("lowner").innerHTML = "";
  document.getElementById("lattribution").innerHTML = "";
  document.getElementById("lcreated").innerHTML = "";
  document.getElementById("lupdated").innerHTML = "";

}

function truncate(string){
 if (string.length > 200)
  return string.substring(0,200)+'...';
else
  return string;
};

function getCategoryId(type){
  switch (type){
    case "Transportation":
    return 0;
    break;
    case "City Government":
    return 1;
    break;
    case "Business":
    return 2;

    break;
    case "Education":
    return 3;

    break;
    case "Environment":
    return 4;
    break;
    case "Health":
    return 5;

    break;
    case "Housing & Development":
    return 6;

    break;
    case "Public Safety":
    return 7;

    break;
    case "Recreation":
    return 8;

    break;
    case "Social Services":
    return 9;

    break; 


  }
}

function getTypeIcon(type){

  if(type == "Map"){
    c = "img/iconmap.png";
    return c;
  }
  if(type == "Filter"){
    c = "img/iconfilter.png";
    return c;
  }
  if(type == "Tabular"){
    c = "img/icontable.png";
    return c;
  }
  if(type == "Chart"){
    c = "img/iconchart.png";
    return c;
  }
  if(type == "External"){
    c = "img/iconexternal.png";
    return c;
  }
  if(type == "Blob"){
    c = "img/iconattach.png";
    return c;
  }
}

function timeConverter(UNIX_timestamp){
 var a = new Date(UNIX_timestamp*1000);
 var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
 var year = a.getFullYear();
 var month = months[a.getMonth()];
 var date = a.getDate();
 var hour = a.getHours();
 var min = a.getMinutes();
 var sec = a.getSeconds();

 if (hour.length == 1)
 {
  hours = "0" + hours;
}

var time = date+' '+month+' '+year+' at '+hour+':'+min;
return time;
}

function typeParse(type){
 var StrippedString = type.replace(/(<([^>]+)>)/ig,"");
 return StrippedString;

}

function tickold() {
  link.attr("x1", function(d) { return d.source.x; })
  .attr("y1", function(d) { return d.source.y; })
  .attr("x2", function(d) { return d.target.x; })
  .attr("y2", function(d) { return d.target.y; });

  //node.attr("cx", function(d) { return d.x; })
  //.attr("cy", function(d) { return d.y; });

  node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
}

// Color leaf nodes orange, and packages white or blue.
function color(d) {
  return d._children ? "#3182bd" : d.children ? "#c6dbef" : "#fd8d3c";
}

// Toggle children on click.
function click(d) {

  if (d.children) {
    d._children = d.children;
    d.children = null;
  } else {
    d.children = d._children;
    d._children = null;
  }
  update();
}

// Returns a list of all nodes under the root.
function flatten(root) {
  var nodes = [], i = 0;


  


  function recurse(node) {
    if (node.children) node.children.forEach(recurse);
    if (!node.id) node.id = ++i;
    nodes.push(node);
  }
  
  //recurse(root);
  recurse(root);

  

  return nodes;

}