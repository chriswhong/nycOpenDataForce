var w = 1100,
  h = 1200,
  node,
  link;

// D3 force layout configuration
var force = d3.layout.force()
  .size([w, h])
  .charge(function (d) {
    if (d.type == "agency") {
      return "-5000";
    }
    else if (d.type == "root") {
      return "-10000";
    }
    else {
      return "-200";
    }
  })
  .gravity(1)
  .friction(.3);

// Main SVG container
var vis = d3.select("#chart")
  .append("svg:svg")
  .attr("width", w)
  .attr("height", h);

// Fetch NYC Open Data datasets
async function fetchNYCData() {
  const baseUrl = "https://data.cityofnewyork.us/resource/5tqd-u88y.json?$Select=uid,datasetinformation_agency,type,description,name,category";
  const urls = [
    baseUrl,
    baseUrl + "&$offset=1000",
    baseUrl + "&$offset=2000",
    baseUrl + "&$offset=3000"
  ];
  const responses = await Promise.all(urls.map(url => fetch(url)));
  const jsonArrays = await Promise.all(responses.map(res => res.json()));
  return jsonArrays.flat();
}

// Group datasets by agency
function processNYCData(json) {
  const agencyMap = {};
  for (let i = 0; i < json.length; i++) {
    const dataset = json[i];
    const agencyName = dataset.datasetinformation_agency || 'Unknown Agency';
    if (!agencyMap[agencyName]) {
      agencyMap[agencyName] = [];
    }
    agencyMap[agencyName].push(dataset);
  }
  // Build agency nodes
  const agencyArr = Object.keys(agencyMap).map(name => ({
    name,
    children: agencyMap[name],
    type: 'agency'
  }));
  // root is now local
  const root = {
    name: "NYC",
    type: "root",
    children: agencyArr
  };
  return { agencyArr, root };
}

// Render the force-directed visualization
function renderNYCVisualization(processed) {
  var nodes = flatten(processed.root),
    links = d3.layout.tree().links(nodes);

  force
    .nodes(nodes)
    .links(links);

  force.start();
  for (var i = 300; i > 0; --i) force.tick();
  force.stop();

  link = vis.selectAll("line.link")
    .data(links, function (d) { return d.target.id; });

  link.enter().insert("svg:line", ".node")
    .attr("class", "link")
    .attr("x1", function (d) { return d.source.x; })
    .attr("y1", function (d) { return d.source.y; })
    .attr("x2", function (d) { return d.target.x; })
    .attr("y2", function (d) { return d.target.y; });

  link.exit().remove();

  node = vis.selectAll(".node")
    .data(nodes, function (d) { return d.id; })
    .enter().append("g")
    .attr("class", function (d) {
      if (d.type == "root") return "root"
      else return "node"
    })
    .on("click", function (d) {
      var url = `https://data.cityofnewyork.us/d/${d.uid}`
      window.open(url, "_blank");
    })
    .on("mouseover", function (d) {
      d3.select(d3.event.target).classed("highlight", true);
      if (d.type === 'agency') {
        d3.selectAll(`.node.${getAgencyAcronym(d.name)}`).classed("highlight", true);
      } 
      if (d.type === 'dataset') {
        d3.selectAll(`.maincircle.${getAgencyAcronym(d.datasetinformation_agency)}`).classed("highlight", true);
      }
      if (d.type == "agency") {
        document.getElementById("lname").innerHTML = "Category: " + d.name;
        clearLegend();
      }
      else if (d.type == "root") {
        document.getElementById("lname").innerHTML = "NYC Open Data";
        clearLegend();
      }
      else {
        document.getElementById("lname").innerHTML = d.name + "<img src = " + getTypeIcon(d.type) + " class = 'legendIcon'>";
        document.getElementById("ldescription").innerHTML = truncate(d.description);
        document.getElementById("lowner").innerHTML = "<span class = 'miniBlue'>Owner: </span>" + d.datasetinformation_agency;
      }
    })
    .on("mouseout", function (d) {
      d3.select(d3.event.target).classed("highlight", false);
      if (d.type === 'agency') {
        d3.selectAll(`.node.${getAgencyAcronym(d.name)}`).classed("highlight", false);
      }
      if (d.type === 'dataset') {
        d3.selectAll(`.maincircle.${getAgencyAcronym(d.datasetinformation_agency)}`).classed("highlight", false);
      }
    });

  // Append circles and icons/text to nodes
  node.append("svg:circle")
    .attr("r", function (d) {
      if (d.type == "agency") {
        return "25px";
      }
      else if (d.type == "root") {
        return "45px";
      }
      else {
        return "7px";
      }
    })
    .attr("class", function (d) {
      if (d.flag == 1) {
        return "view";
      }
      if (d.type == "agency") {
        return `maincircle ${getAgencyAcronym(d.name)}`;
      }
      if (d.type == "root") {
        return "maincircle";
      }
      else {
        return `node ${getAgencyAcronym(d.datasetinformation_agency)}`;
      }
    });

  node.each(function (d) {
    const g = d3.select(this);
    if (d.type === "agency") {
      const acronym = getAgencyAcronym(d.name);
      g.append("text")
        .text(acronym)
        .attr("y", 5)
        .attr("text-anchor", "middle")
        .attr("class", "agency-acronym")
    } else {
      g.append("svg:image")
        .attr("xlink:href", function () {
          const c = getTypeIcon(d.type);
          return c;
        })
        .attr("x", "-4px")
        .attr("y", "-4px")
        .attr("height", "8px")
        .attr("width", "8px")
        .attr("class", "nodeimg");
    }
  });

  node.attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; });

  r = vis.selectAll(".root");

  r.append('text')
    .text("NYC")
    .attr("y", "-12px")
    .attr("class", "centertextbold");

  r.append('text')
    .text("Open")
    .attr("y", "10px")
    .attr("class", "centertext");

  r.append('text')
    .text("Data")
    .attr("y", "32px")
    .attr("class", "centertext");

  // Fade in/out UI elements
  $('#loading').fadeOut('slow', function () { });
  $('#chart').fadeIn('slow', function () { });
  $('#legend').fadeIn('slow', function () { });
  $('#headerouter').fadeIn('slow', function () { });
}

// Main entry point
(async function main() {
  const rawData = await fetchNYCData();
  const processed = processNYCData(rawData);
  renderNYCVisualization(processed);
})();

// About box event handlers
$("#about").click(function () {
  $('#aboutbox').fadeIn('fast', function () { });
});

$(".closex").click(function () {
  $('#aboutbox').fadeOut('slow', function () { });
});

// Utility: clear legend info
function clearLegend() {
  document.getElementById("ldescription").innerHTML = "";
  document.getElementById("lowner").innerHTML = "";
  document.getElementById("lattribution").innerHTML = "";
  document.getElementById("lcreated").innerHTML = "";
  document.getElementById("lupdated").innerHTML = "";
}

// Utility: truncate long strings
function truncate(string) {
  if (string.length > 200)
    return string.substring(0, 200) + '...';
  else
    return string;
};

// Utility: get category id (legacy)
function getCategoryId(type) {
  switch (type) {
    case "Transportation":
      return 0;
    case "City Government":
      return 1;
    case "Business":
      return 2;
    case "Education":
      return 3;
    case "Environment":
      return 4;
    case "Health":
      return 5;
    case "Housing & Development":
      return 6;
    case "Public Safety":
      return 7;
    case "Recreation":
      return 8;
    case "Social Services":
      return 9;
  }
}

// Utility: get icon for dataset type
function getTypeIcon(type) {
  switch (type) {
    case "map":
      return "img/iconmap.png";
    case "filter":
      return "img/iconfilter.png";
    case "dataset":
      return "img/icontable.png";
    case "chart":
      return "img/iconchart.png";
    case "href":
      return "img/iconexternal.png";
    case "file":
      return "img/iconattach.png";
    default:
      return "";
  }
}

// Utility: convert unix timestamp to readable string
function timeConverter(UNIX_timestamp) {
  var a = new Date(UNIX_timestamp * 1000);
  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var year = a.getFullYear();
  var month = months[a.getMonth()];
  var date = a.getDate();
  var hour = a.getHours();
  var min = a.getMinutes();
  var sec = a.getSeconds();
  if (hour.length == 1) {
    hours = "0" + hours;
  }
  var time = date + ' ' + month + ' ' + year + ' at ' + hour + ':' + min;
  return time;
}

// Utility: strip HTML tags from type string
function typeParse(type) {
  var StrippedString = type.replace(/(<([^>]+)>)/ig, "");
  return StrippedString;
}

// Utility: flatten tree structure to array
function flatten(root) {
  var nodes = [], i = 0;
  function recurse(node) {
    if (node.children) node.children.forEach(recurse);
    if (!node.id) node.id = ++i;
    nodes.push(node);
  }
  recurse(root);
  return nodes;
}

// Agency acronym lookup
const agencyAcronyms = {
  "Mayor's Office for Economic Opportunity": "MOEO",
  "Office of the Mayor": "MAYOR",
  "NYC Service": "SERVICE",
  "Other": "OTHER",
  "Civil Service Commission": "CSC",
}

// Utility: get agency acronym from name
function getAgencyAcronym(name) {
  const match = name && name.match(/\(([^)]+)\)/);
  if (match && match[1]) {
    return match[1];
  }
  return agencyAcronyms[name] || "unknown";
}

