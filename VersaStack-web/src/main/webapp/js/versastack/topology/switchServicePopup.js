"use strict";
define(["local/d3", "local/versastack/utils"],
        function (d3, utils) {
            var map_ = utils.map_;



            function SwitchPopup(outputApi, renderApi) {
                this.svgContainer = null;
                this.dx = 0;
                this.dy = 0;
                this.neckLength = 0;
                this.neckWidth = 0;
                this.width = 0;
                this.height = 0;
                this.buffer = 0;
                this.bevel = 10;
                this.svgNeck = null;
                this.svgBubble = null;
                this.color = "";
                this.tabColor = "";
                this.tabWidth = 0;
                this.tabHeight = 0;
                this.ports = [];
                this.portColor = "";
                this.portEmptyColor = "";
                this.portHeight = 0;
                this.portWidth = 0;
                /**@type Service**/
                this.hostNode = null;

                var that = this;
                this.setOffset = function (x, y) {
                    this.dx = x;
                    this.dy = y;
                    return this;
                };
                this.setHostNode = function(hostNode){
                    this.hostNode=hostNode;
                    return this;
                }
                
                this.setBuffer = function(buffer){
                    this.buffer=buffer;
                    return this;
                }
                
                this.setDimensions = function (width, height) {
                    this.width = width;
                    this.height = height;
                    return this;
                };
                this.setTabDimensions = function (tabWidth, tabHeight) {
                    this.tabWidth = tabWidth;
                    this.tabHeight = tabHeight;
                    return this;
                };
                this.setBevel = function (r) {
                    this.bevel = r;
                    return this;
                };
                this.setContainer = function (container) {
                    this.svgContainer = container;
                    return this;
                };
                this.setColor = function (color) {
                    this.color = color;
                    return this;
                };
                
                this.setTabColor = function (tabColor) {
                    this.tabColor = tabColor;
                    return this;
                };
                this.setPorts = function (ports) {
                    map_(this.ports, function (port) {
                        port.isVisible = false;
                    });
                    this.ports = ports;
                    map_(this.ports, function (port) {
                        port.isVisible = true;
                    });
                    return this;
                };
                this.setPortColor = function (color) {
                    this.portColor = color;
                    return this;
                };
                this.setPortEmptyColor = function (color) {
                    this.portEmptyColor = color;
                    return this;
                };
                this.setPortDimensions = function (width, height) {
                    this.portWidth = width;
                    this.portHeight = height;
                    return this;
                };
                this.setHostNode = function (n) {
                    this.hostNode = n;
                    return this;
                };


                var lastMouse;
                /**@param {Node} n**/

                function makeDragBehaviour() {
                    return d3.behavior.drag()
                            .on("drag", function () {
                                //Using the dx,dy from d3 can lead to some artifacts when also using
                                //These seem to occur when moving between different transforms
                                var e = d3.event.sourceEvent;
                                var dx = (e.clientX - lastMouse.clientX) / outputApi.getZoom();
                                var dy = (e.clientY - lastMouse.clientY) / outputApi.getZoom();
                                lastMouse = e;
                                that.dx+=dx;
                                that.dy+=dy;
                                that.render();
                                
                            })
                            .on("dragstart", function () {
                                lastMouse = d3.event.sourceEvent;
                                outputApi.disablePanning();

                            })
                            .on("dragend", function () {
                                outputApi.enablePanning();

                            });

                }

                this.render = function () {
                    if(!this.hostNode){
                        return;
                    }
                    var container = this.svgContainer.select("#switchPopup");
                    container.selectAll("*").remove();
                    var anchor = this.hostNode.getCenterOfMass();
                    //draw switch popup
                     container.append("rect")
                            .attr("x", anchor.x - this.width / 2 + this.dx)
                            .attr("y", anchor.y + this.dy)
                            .attr("height", this.height)
                            .attr("width", this.width)
                            .attr("rx", this.bevel)
                            .attr("ry", this.bevel)
                            .style("fill", this.color)
                            .call(makeDragBehaviour());
                    
                    //draw subnet tab
                     var subnetContainer = this.svgContainer.select("#tab");
                    subnetContainer.selectAll("*").remove();

                    

                    var x = anchor.x - this.width / 2 +this.dx +this.bevel;
                    var y = anchor.y + this.dy;
                    
                    map_(this.hostNode.subnets, function(subnet){
                        
                        
                        container.append("rect")
                                .attr("x", x)
                                .attr("y", y)
                                .attr("height", that.tabHeight)
                                .attr("width", that.tabWidth)
                                .style("fill", that.tabColor) 
                        x += that.tabWidth +that.buffer;
                        
                       
                    });

                               
                    var serviceChoords = this.hostNode.getCenterOfMass();
                    container.append("line")
                            .attr("x1", anchor.x + this.dx)
                            .attr("y1", anchor.y + this.dy)
                            .attr("x2", serviceChoords.x)
                            .attr("y2", serviceChoords.y)
                            .style("stroke", this.color);
                    

                   


                };


                
            }


            return SwitchPopup;
        });
