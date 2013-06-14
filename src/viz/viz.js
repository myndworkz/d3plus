vizwhiz.viz = function() {

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Public Variables with Default Settings
  //-------------------------------------------------------------------
  
  var vars = {
    "active_var": "active",
    "arc_angles": {},
    "arc_inners": {},
    "arc_sizes": {},
    "attrs": null,
    "boundries": null,
    "click_function": function() { return null },
    "connections": null,
    "coords": null,
    "csv_columns": null,
    "data": null,
    "data_source": null,
    "depth": null,
    "donut": true,
    "filter": [],
    "filtered_data": null,
    "group_bgs": true,
    "grouping": "name",
    "highlight": null,
    "id_var": "id",
    "init": true,
    "keys": [],
    "labels": true,
    "layout": "value",
    "links": null,
    "map": {"coords": null, 
            "style": {"land": {"fill": "#f9f4e8"}, 
                      "water": {"fill": "#bfd1df"}
                     }
           },
    "margin": {"top": 0, "right": 0, "bottom": 0, "left": 0},
    "name_array": null,
    "nesting": [],
    "nesting_aggs": {},
    "nodes": null,
    "number_format": function(d) { 
      if (typeof d === "number") return d3.format(",f")(d)
      else return d3.format(",f")(d.value) 
    },
    "order": "asc",
    "projection": d3.geo.mercator(),
    "solo": [],
    "sort": "total",
    "source_text": null,
    "spotlight": true,
    "sub_title": null,
    "svg_height": window.innerHeight,
    "svg_width": window.innerWidth,
    "text_format": function(d) { return d },
    "text_var": "name",
    "tiles": true,
    "title": null,
    "tooltip_info": [],
    "total_bar": false,
    "type": "tree_map",
    "value_var": "value",
    "xaxis_domain": null,
    "xaxis_var": null,
    "yaxis_domain": null,
    "yaxis_var": null,
    "year": null,
    "years": null,
    "year_var": "year",
    "zoom_behavior": d3.behavior.zoom()
  }
  
  var nodes, links;
  
  //===================================================================

  chart = function(selection) {
    selection.each(function(data) {

      if (vizwhiz.dev) console.log("Initializing App")

      vizwhiz.tooltip.remove();
      vars.parent = d3.select(this)
      
      vars.svg = vars.parent.selectAll("svg").data([data]);
      
      vars.svg_enter = vars.svg.enter().append("svg")
        .attr('width',vars.svg_width)
        .attr('height',vars.svg_height)
        .style("z-index", 10)
        .style("position","absolute");
    
      vars.svg.transition().duration(vizwhiz.timing)
        .attr('width',vars.svg_width)
        .attr('height',vars.svg_height)
        
      if (vizwhiz.dev) console.log("Establishing Year Range and Current Year")
        
      vars.years = vizwhiz.utils.uniques(data,vars.year_var)
      if (!vars.year) vars.year = vars.years[vars.years.length-1]


      if (vizwhiz.dev) console.log("Filtering Data")
      vars.keys = {}
      var filtered_data = data.filter(function(d){
        for (k in d) {
          if (!vars.keys[k]) {
            vars.keys[k] = typeof d[k]
          }
        }
        if (vars.xaxis_var) {
          if (typeof d[vars.xaxis_var] == "undefined") return false
        }
        if (vars.yaxis_var) {
          if (typeof d[vars.yaxis_var] == "undefined") return false
        }
        if (vars.spotlight && vars.type == "pie_scatter") {
          if (d[vars.active_var]) return false
        }
        if (vars.year && vars.type != "stacked") return d[vars.year_var] == vars.year;
        return true;
      })
      
      // Filter & Solo the data!
      removed_ids = []
      if (vars.solo.length || vars.filter.length) {
        if (vizwhiz.dev) console.log("Removing Solo/Filters")
        filtered_data = filtered_data.filter(function(d){
          var check = [d[vars.id_var],d[vars.text_var]]
          vars.nesting.forEach(function(key){
            for (x in d[key]) {
              check.push(d[key][x])
            }
          })
          var match = false
          if (d[vars.id_var] != vars.highlight || vars.type != "rings") {
            if (vars.solo.length) {
              check.forEach(function(c){
                if (vars.solo.indexOf(c) >= 0) match = true;
              })
              if (match) return true
              removed_ids.push(d[vars.id_var])
              return false
            }
            else {
              check.forEach(function(c){
                if (vars.filter.indexOf(c) >= 0) match = true;
              })
              if (match) {
                removed_ids.push(d[vars.id_var])
                return false
              }
              return true
            }
          }
          else {
            return true
          }
        })
        
      }
      
      if (["network","rings"].indexOf(vars.type) >= 0) {
        if (vars.solo.length || vars.filter.length) {
          vars.nodes = nodes.filter(function(n){
            if (removed_ids.indexOf(n[vars.id_var]) >= 0) {
              return false;
            }
            else {
              return true;
            }
          })
          vars.links = links.filter(function(l){
            if (removed_ids.indexOf(l.source[vars.id_var]) >= 0
             || removed_ids.indexOf(l.target[vars.id_var]) >= 0) {
              return false;
            }
            else {
              return true;
            }
          })
        }
        else {
          vars.nodes = nodes
          vars.links = links
        }
        vars.connections = get_connections(vars.links)
      }
      
      // create CSV data
      vars.filtered_data = filtered_data;
      
      if (!vars.total_bar) {
        var total_val = null
      }
      else {
        var total_val = d3.sum(filtered_data, function(d){ 
          return d[vars.value_var] 
        })
      }

      if (["tree_map","pie_scatter"].indexOf(vars.type) >= 0) {
        if (vizwhiz.dev) console.log("Nesting Data")
        vars.data = nest(filtered_data)
      }
      else if (vars.type == "stacked") {
        if (vizwhiz.dev) console.log("Nesting Data")
        var temp_data = []
        vars.years.forEach(function(year){
          var year_data = filtered_data.filter(function(d){
            return d[vars.year_var] == year;
          })
          year_data = nest(year_data)
          temp_data = temp_data.concat(year_data)
        })
        vars.data = temp_data
      }
      else if (["geo_map","network","rings"].indexOf(vars.type) >= 0) {
        vars.data = {};
        filtered_data.forEach(function(d){
          vars.data[d[vars.id_var]] = d;
        })
      }
      else {
        vars.data = filtered_data
      }
      vars.width = vars.svg_width;

      if (vizwhiz.dev) console.log("Creating Titles")
      vars.margin.top = 0;
      if (vars.svg_width < 300 || vars.svg_height < 200) {
        vars.small = true;
        make_title(null,"title");
        make_title(null,"sub_title");
        make_title(null,"total_bar");
      }
      else {
        vars.small = false;
        make_title(vars.title,"title");
        make_title(vars.sub_title,"sub_title");
        make_title(total_val,"total_bar");
      }
      
      if (vars.margin.top > 0) vars.margin.top += 3
      
      vars.height = vars.svg_height - vars.margin.top;
      
      vars.svg_enter.append("clipPath")
        .attr("id","clipping")
        .append("rect")
          .attr("width",vars.width)
          .attr("height",vars.height)
      
      vars.svg.select("#clipping rect").transition().duration(vizwhiz.timing)
        .attr("width",vars.width)
        .attr("height",vars.height)
    
      vars.parent_enter = vars.svg_enter.append("g")
        .attr("class","parent")
        .attr("width",vars.width)
        .attr("height",vars.height)
        .attr("clip-path","url(#clipping)")
        .attr("transform","translate("+vars.margin.left+","+vars.margin.top+")")
    
      vars.svg.select("g.parent").transition().duration(vizwhiz.timing)
        .attr("width",vars.width)
        .attr("height",vars.height)
        .attr("transform","translate("+vars.margin.left+","+vars.margin.top+")")
        
      if (vizwhiz.dev) console.log("Building Specific App")
      vizwhiz[vars.type](vars);
      
    });
    
    return chart;
  }
  
  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Helper Functions
  //-------------------------------------------------------------------

  nest = function(flat_data) {
  
    var flattened = [];
    var nested_data = d3.nest();
    
    var levels = vars.depth ? vars.nesting.slice(0,vars.nesting.indexOf(vars.depth)+1) : vars.nesting
    
    levels.forEach(function(nest_key, i){
    
      nested_data
        .key(function(d){ return d[nest_key].id+"|"+d[nest_key].name; })
        
      if (i == levels.length-1) {
        nested_data.rollup(function(leaves){
          
          if(leaves.length == 1){
            flattened.push(leaves[0]);
            return leaves[0]
          }
          
          to_return = {
            "name": leaves[0][nest_key].name,
            "id": leaves[0][nest_key].id,
            "num_children": leaves.length,
            "num_children_active": d3.sum(leaves, function(d){ return d.active; })
          }
          
          if (leaves[0][nest_key].display_id) to_return.display_id = leaves[0][nest_key].display_id;
          
          for (key in vars.keys) {
            if (vars.nesting_aggs[key]) {
              to_return[key] = d3[vars.nesting_aggs[key]](leaves, function(d){ return d[key]; })
            }
            else {
              if (["color",vars.year_var].indexOf(key) >= 0) {
                to_return[key] = leaves[0][key];
              }
              else if (vars.keys[key] === "number") {
                to_return[key] = d3.sum(leaves, function(d){ return d[key]; })
              }
            }
          }
          
          if(vars.type != "tree_map"){
            levels.forEach(function(nk){
              to_return[nk] = leaves[0][nk]
            })
            flattened.push(to_return);
          }
        
          return to_return
        })
      }
    
    })
    
    nested_data = nested_data
      .entries(flat_data)
      .map(vizwhiz.utils.rename_key_value);

    if(vars.type != "tree_map"){
      return flattened;
    }

    return {"name":"root", "children": nested_data};

  }

  make_title = function(title,type){
    
    // Set the total value as data for element.
    var data = title ? [title] : [],
        font_size = type == "title" ? 18 : 13,
        title_position = {
          "x": vars.width/2,
          "y": vars.margin.top
        }
        
    if (type == "total_bar" && title) {
      data = vars.number_format(data[0])
      vars.total_bar.prefix ? data = vars.total_bar.prefix + data : null;
      vars.total_bar.suffix ? data = data + vars.total_bar.suffix : null;
      data = [data]
    }
    
    var total = vars.svg.selectAll("g."+type).data(data)
    
    // Enter
    total.enter().append("g")
      .attr("class",type)
      .style("opacity",0)
      .append("text")
        .attr(title_position)
        .attr("font-size",font_size)
        .attr("fill","#333")
        .attr("text-anchor", "middle")
        .attr("font-family", "Helvetica")
        .style("font-weight", "normal")
        .each(function(d){
          vizwhiz.utils.wordwrap({
            "text": d,
            "parent": this,
            "width": vars.svg_width,
            "height": vars.svg_height/8,
            "resize": false
          })
        })
    
    // Update
    total.transition().duration(vizwhiz.timing)
      .style("opacity",1)
    total.select("text").transition().duration(vizwhiz.timing)
      .attr(title_position)
      .each(function(d){
        vizwhiz.utils.wordwrap({
          "text": d,
          "parent": this,
          "width": vars.svg_width,
          "height": vars.svg_height/4,
          "resize": false
        })
      })
    
    // Exit
    total.exit().transition().duration(vizwhiz.timing)
      .style("opacity",0)
      .remove();

    if (total.node()) vars.margin.top += total.select("text").node().getBBox().height

  }
  
  get_connections = function(links) {
    var connections = {};
    links.forEach(function(d) {
      if (!connections[d.source[vars.id_var]]) {
        connections[d.source[vars.id_var]] = []
      }
      connections[d.source[vars.id_var]].push(d.target)
      if (!connections[d.target[vars.id_var]]) {
        connections[d.target[vars.id_var]] = []
      }
      connections[d.target[vars.id_var]].push(d.source)
    })
    return connections;
  }
  
  get_tooltip_data = function(id,length) {

    if (!length) var length = "long"
    
    if (["network","rings"].indexOf(vars.type) >= 0) {
      var tooltip_highlight = vars.active_var
    }
    else {
      var tooltip_highlight = vars.value_var
    }

    if (vars.tooltip_info instanceof Array) var a = vars.tooltip_info
    else var a = vars.tooltip_info[length]
    
    var data = []
    a.forEach(function(t){
      var value = find_variable(id,t)
      var name = vars.text_format(t)
      if (value) {
        var h = t == tooltip_highlight
        data.push({"name": name, "value": value, "highlight": h, "format": vars.number_format})
      }
    })
    
    return data
    
  }
  
  find_variable = function(id,variable) {
    
    if (typeof id == "string") {
      var data = vars.filtered_data.filter(function(d){
        return d[vars.id_var] == id
      })[0]
    }
    else {
      var data = id
    }
    
    
    var attr = vars.attrs[id]
    
    var value = false
    
    if (data && data[variable]) value = data[variable]
    else if (attr && attr[variable]) value = attr[variable]
    else if (variable == "color") value = vizwhiz.utils.rand_color()
    
    if (variable == vars.text_var && value) {
      return vars.text_format(value)
    }
    else return value
    
  }
  
  //===================================================================
  
  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Expose Public Variables
  //-------------------------------------------------------------------
  
  chart.active_var = function(x) {
    if (!arguments.length) return vars.active_var;
    vars.active_var = x;
    return chart;
  };
  
  chart.attrs = function(x) {
    if (!arguments.length) return vars.attrs;
    vars.attrs = x;
    return chart;
  };
  
  chart.click_function = function(x) {
    if (!arguments.length) return vars.click_function;
    vars.click_function = x;
    return chart;
  };
  
  chart.csv_data = function(x) {
    if (!arguments.length) {
      var csv_to_return = []
      
      // filter out the columns (if specified)
      if(vars.csv_columns){
        vars.filtered_data.map(function(d){
          d3.keys(d).forEach(function(d_key){
            if(vars.csv_columns.indexOf(d_key) < 0){
              delete d[d_key]
            }
          })
        })
      }
      
      csv_to_return.push(d3.keys(vars.filtered_data[0]));
      vars.filtered_data.forEach(function(d){
        csv_to_return.push(d3.values(d))
      })
      return csv_to_return;
    }
    return chart;
  };
  
  chart.csv_columns = function(x) {
    if (!arguments.length) return vars.csv_columns;
    vars.csv_columns = x;
    return chart;
  };
  
  chart.coords = function(x) {
    if (!arguments.length) return vars.coords;
    vars.coords = topojson.object(x, x.objects[Object.keys(x.objects)[0]]).geometries;
    vars.boundries = {"coordinates": [[]], "type": "Polygon"}
    vars.coords.forEach(function(v,i){
      v.coordinates.forEach(function(c){
        c.forEach(function(a){
          if (a.length == 2) vars.boundries.coordinates[0].push(a)
          else {
            a.forEach(function(aa){
              vars.boundries.coordinates[0].push(aa)
            })
          }
        })
      })
    })
    return chart;
  };
  
  chart.data_source = function(x) {
    if (!arguments.length) return vars.data_source;
    vars.data_source = x;
    return chart;
  };
  
  chart.depth = function(x) {
    if (!arguments.length) return vars.depth;
    vars.depth = x;
    return chart;
  };

  chart.donut = function(x) {
    if (!arguments.length) return vars.donut;
    if (typeof x == "boolean")  vars.donut = x;
    else if (x === "false") vars.donut = false;
    else vars.donut = true;
    return chart;
  };

  chart.filter = function(x) {
    if (!arguments.length) return vars.filter;
    // if we're given an array then overwrite the current filter var
    if(x instanceof Array){
      vars.filter = x;
    }
    // otherwise add/remove it from array
    else {
      // if element is in the array remove it
      if(vars.filter.indexOf(x) > -1){
        vars.filter.splice(vars.filter.indexOf(x), 1)
      }
      // if element is in the solo array remove it and add to this one
      else if(vars.solo.indexOf(x) > -1){
        vars.solo.splice(vars.solo.indexOf(x), 1)
        vars.filter.push(x)
      }
      // element not in current filter so add it
      else {
        vars.filter.push(x)
      }
    }
    return chart;
  };

  chart.group_bgs = function(x) {
    if (!arguments.length) return vars.group_bgs;
    if (typeof x == "boolean")  vars.group_bgs = x;
    else if (x === "false") vars.group_bgs = false;
    else vars.group_bgs = true;
    return chart;
  };

  chart.grouping = function(x) {
    if (!arguments.length) return vars.grouping;
    vars.grouping = x;
    return chart;
  };

  chart.height = function(x) {
    if (!arguments.length) return vars.svg_height;
    vars.svg_height = x;
    return chart;
  };
  
  chart.highlight = function(value) {
    if (!arguments.length) return vars.highlight;
    vars.highlight = value;
    return chart;
  };
  
  chart.id_var = function(x) {
    if (!arguments.length) return vars.id_var;
    vars.id_var = x;
    return chart;
  };

  chart.labels = function(x) {
    if (!arguments.length) return vars.labels;
    vars.labels = x;
    return chart;
  };
  
  chart.layout = function(x) {
    if (!arguments.length) return vars.layout;
    vars.layout = x;
    return chart;
  };
  
  chart.links = function(x) {
    if (!arguments.length) return vars.links;
    links = x;
    return chart;
  };
  
  chart.map = function(x,style) {
    if (!arguments.length) return vars.map;
    vars.map.coords = x;
    if (style) {
      vars.map.style.land = style.land ? style.land : map.style.land;
      vars.map.style.water = style.water ? style.water : map.style.water;
    }
    return chart;
  };
  
  chart.name_array = function(x) {
    if (!arguments.length) return vars.name_array;
    vars.name_array = x;
    return chart;
  };
  
  chart.nesting = function(x) {
    if (!arguments.length) return vars.nesting;
    vars.nesting = x;
    return chart;
  };
  
  chart.nesting_aggs = function(x) {
    if (!arguments.length) return vars.nesting_aggs;
    vars.nesting_aggs = x;
    return chart;
  };
  
  chart.nodes = function(x) {
    if (!arguments.length) return vars.nodes;
    nodes = x;
    return chart;
  };
  
  chart.number_format = function(x) {
    if (!arguments.length) return vars.number_format;
    vars.number_format = x;
    return chart;
  };
  
  chart.order = function(x) {
    if (!arguments.length) return vars.order;
    vars.order = x;
    return chart;
  };
    
  chart.solo = function(x) {
    if (!arguments.length) return vars.solo;
    // if we're given an array then overwrite the current filter var
    if(x instanceof Array){
      vars.solo = x;
    }
    // otherwise add/remove it from array
    else {
      // if element is in the array remove it
      if(vars.solo.indexOf(x) > -1){
        vars.solo.splice(vars.solo.indexOf(x), 1)
      }
      // if element is in the filter array remove it and add to this one
      else if(vars.filter.indexOf(x) > -1){
        vars.filter.splice(vars.filter.indexOf(x), 1)
        vars.solo.push(x)
      }
      // element not in current filter so add it
      else {
        vars.solo.push(x)
      }
    }
    return chart;
  };
  
  chart.sort = function(x) {
    if (!arguments.length) return vars.sort;
    vars.sort = x;
    return chart;
  };
  
  chart.source_text = function(x) {
    if (!arguments.length) return vars.source_text;
    vars.source_text = x;
    return chart;
  };

  chart.spotlight = function(x) {
    if (!arguments.length) return vars.spotlight;
    if (typeof x == "boolean")  vars.spotlight = x;
    else if (x === "false") vars.spotlight = false;
    else vars.spotlight = true;
    return chart;
  };
  
  chart.sub_title = function(x) {
    if (!arguments.length) return vars.sub_title;
    vars.sub_title = x;
    return chart;
  };
  
  chart.text_format = function(x) {
    if (!arguments.length) return vars.text_format;
    vars.text_format = x;
    return chart;
  };
  
  chart.text_var = function(x) {
    if (!arguments.length) return vars.text_var;
    vars.text_var = x;
    return chart;
  };
  
  chart.tiles = function(x) {
    if (!arguments.length) return vars.tiles;
    if (typeof x == "boolean")  vars.tiles = x;
    else if (x === "false") vars.tiles = false;
    else vars.tiles = true;
    return chart;
  };
  
  chart.title = function(x) {
    if (!arguments.length) return vars.title;
    vars.title = x;
    return chart;
  };
  
  chart.tooltip_info = function(x) {
    if (!arguments.length) return vars.tooltip_info;
    vars.tooltip_info = x;
    return chart;
  };
  
  chart.total_bar = function(x) {
    if (!arguments.length) return vars.total_bar;
    vars.total_bar = x;
    return chart;
  };
  
  chart.type = function(x) {
    if (!arguments.length) return vars.type;
    vars.type = x;
    return chart;
  };
  
  chart.value_var = function(x) {
    if (!arguments.length) return vars.value_var;
    vars.value_var = x;
    return chart;
  };

  chart.width = function(x) {
    if (!arguments.length) return vars.svg_width;
    vars.svg_width = x;
    return chart;
  };
  
  chart.xaxis_domain = function(x) {
    if (!arguments.length) return vars.xaxis_domain;
    vars.xaxis_domain = x;
    return chart;
  };
  
  chart.xaxis_var = function(x) {
    if (!arguments.length) return vars.xaxis_var;
    vars.xaxis_var = x;
    return chart;
  };
  
  chart.yaxis_domain = function(x) {
    if (!arguments.length) return vars.yaxis_domain;
    vars.yaxis_domain = x;
    return chart;
  };
  
  chart.yaxis_var = function(x) {
    if (!arguments.length) return vars.yaxis_var;
    vars.yaxis_var = x;
    return chart;
  };
  
  chart.year = function(x) {
    if (!arguments.length) return vars.year;
    vars.year = x;
    return chart;
  };
  
  chart.year_var = function(x) {
    if (!arguments.length) return vars.year_var;
    vars.year_var = x;
    return chart;
  };

  //===================================================================

  return chart;
};
