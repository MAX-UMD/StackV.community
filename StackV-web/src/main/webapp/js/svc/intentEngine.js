/* 
 * Copyright (c) 2013-2017 University of Maryland
 * Created by: Alberto Jimenez
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy 
 * of this software and/or hardware specification (the “Work”) to deal in the 
 * Work without restriction, including without limitation the rights to use, 
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of 
 * the Work, and to permit persons to whom the Work is furnished to do so, 
 * subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in 
 * all copies or substantial portions of the Work.
 * 
 * THE WORK IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL 
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE WORK OR THE USE OR OTHER DEALINGS  
 * IN THE WORK.
 */

/* global Mousetrap, keycloak */

var conditions = [];
var factories = {};
var intent;
var transit = false;
var proceeding = false;
var activeStage;

Mousetrap.bind({
    'left': function () {
        prevStage();
    },
    'right': function () {
        nextStage();
    }
});

function loadIntent(type) {
    $.ajax({
        type: "GET",
        url: "/StackV-web/data/xml/" + type + ".xml",
        dataType: "xml",
        success: function (xml) {
            intent = xml.children[0];
            renderIntent();
        },
        error: function (err) {
            console.log('Error Loading XML! \n' + err);
        }
    });
}

function renderIntent() {
    // Stage 1: Initialization                
    initializeIntent();

    // Stage 2: Factorization
    factorizeRendering();
}

function initializeIntent() {
    var panel = $("#intent-panel-body");
    // Initialize meta sidebar
    var meta = intent.children[0];
    initMeta(meta);

    // Begin rendering stages
    var stages = intent.children;
    var $progress = $("#progressbar");
    for (var i = 1; i < stages.length; i++) {
        // Initialize stage panel
        var stage = stages[i];
        var id = constructID(stage);
        var $div = $("<div>", {class: "intent-stage-div", id: id});
        var $prog = $("<li>");
        if (i === 1) {
            $div.addClass("active");
            $activeStage = $div;
            $prog.addClass("active");
        }
        if (stage.getAttribute("condition")) {
            $div.addClass("conditional");
            $div.attr("data-condition", stage.getAttribute("condition"));

            $prog.addClass("conditional");
            $prog.attr("data-condition", stage.getAttribute("condition"));
        }
        if (stage.getAttribute("proceeding") === "true") {
            $div.addClass("proceeding");
        }
        if (stage.getAttribute("return") === "false") {
            $div.addClass("unreturnable");
        }
        $prog.text(stage.getAttribute("name"));
        panel.append($div);
        stages[id] = $div;
        $currentStageDiv = $div;

        $progress.append($prog);
        // Begin recursive rendering
        renderInputs(stage.children, $currentStageDiv);
    }
}


// UTILITY FUNCTIONS
function initMeta(meta) {
    // Render service tag
    var $panel = $("#intent-panel-meta");
    $panel.append($("<div>", {html: meta.children[0].innerHTML, style: "margin-bottom:50px;height:50px;"}));

    // Render blocks
    var $blockDiv = $("<div>").attr("id", "intent-panel-meta-block");
    var blocks = meta.children;
    for (var i = 1; i < blocks.length; i++) {
        var $div = $("<div>", style = "margin-bottom:20px;");
        var block = blocks[i];
        var tag = block.children[0].innerHTML;
        var str = block.children[1].innerHTML;
        var condition = block.getAttribute("condition");

        var $label = $("<label>").text(str);
        var $input = $("<input>", {type: "number", name: "block-" + tag, value: 1, min: 1});
        $input.attr("data-block", tag);
        $input.change(function () {
            var eles = $(".block-" + $(this).data("block"));
            var count = eles.length;
            var val = $(this).val();
            var key = eles.first().data("factory");
            var target = eles.first().data("target");

            // Adding elements
            while (val > count) {
                buildClone(key, target);
                count++;
            }
            // Removing elements            
            while (val < count) {
                eles.last().remove();
                eles = $(".block-" + $(this).data("block"));
                count--;
                factories[key]["count"]--;
            }
        });

        if (condition) {
            $label.addClass("conditional");
            $label.attr("data-condition", condition);
        }

        $label.append($input);
        $div.append($label);

        $blockDiv.append($div);
    }
    $panel.append($blockDiv);

    // Render control buttons
    var $controlDiv = $("<div>").attr("id", "intent-panel-meta-control");
    $controlDiv.append($("<button>", {class: "button-control active", id: "intent-submit", html: "Submit"}));
    $panel.append($controlDiv);

    $("#intent-prev").click(function () {
        prevStage();
    });
    $("#intent-next").click(function () {
        nextStage();
    });
}

function renderInputs(arr, $parent) {
    for (var i = 0; i < arr.length; i++) {
        var ele = arr[i];
        if (ele.nodeName === "group") {
            var name = ele.getAttribute("name");
            var factory = ele.getAttribute("factory");
            var label = ele.getAttribute("label");
            var condition = ele.getAttribute("condition");
            var collapsible = ele.getAttribute("collapsible");
            var block = ele.getAttribute("block");
            var str = name.charAt(0).toUpperCase() + name.slice(1);

            var $div = $("<div>", {class: "intent-group-div", id: constructID(ele)});
            $parent.append($div);
            var $name = $('<div class="group-header col-sm-12"><div class="group-name">' + str + "</div></div>");
            $div.append($name);

            // Handle potential element modifiers            
            var $targetDiv = $div;
            if (collapsible === "true") {
                $targetDiv = collapseDiv($name, $div);
            }
            if (factory === "true") {
                $div.addClass("factory");
                var factObj = {};
                factObj["count"] = 1;
                factories[constructID(ele)] = factObj;
            }
            if (block) {
                $div.addClass("factory");
                $div.addClass("block-" + block);
                var factObj = {};
                factObj["count"] = 1;
                factObj["block"] = block;
                factories[constructID(ele)] = factObj;
            }

            if (label === "false") {
                $div.find(".group-name").addClass("hidden");
            } else {
                $div.addClass("labeled");
            }

            if (condition) {
                $div.addClass("conditional");
                $div.attr("data-condition", condition);
            }

            // Recurse!
            renderInputs(ele.children, $targetDiv);
        } else if (ele.nodeName === "input") {
            var type = ele.children[1].innerHTML;
            var name = constructID(ele);
            var trigger = ele.getAttribute("trigger");
            var condition = ele.getAttribute("condition");

            var $label = $("<label>").text(ele.children[0].innerHTML);
            var $input = $("<input>", {type: type, id: name});
            switch (type) {
                case "button":
                    $input.click(function (e) {
                        nextStage(true);

                        e.preventDefault();
                    });
                    $input.val("Select");
                    break;
            }

            // Handle potential element modifiers
            if (ele.getElementsByTagName("size").length > 0) {
                switch (ele.getElementsByTagName("size")[0].innerHTML) {
                    case "small":
                        $label.addClass("col-sm-4");
                        break;
                    case "large":
                        $label.addClass("col-sm-8");
                        break;
                    default:
                        $label.addClass("col-sm-6");
                }
            } else {
                $label.addClass("col-sm-6");
            }

            if (ele.getElementsByTagName("default").length > 0) {
                $input.val(ele.getElementsByTagName("default")[0].innerHTML);
            }

            // Handle multiple choice sourcing
            if (ele.getElementsByTagName("source").length > 0) {
                $input = $("<select>", {id: name});
                var selectName = name;

                var apiURL = window.location.origin +
                        "/StackV-web/restapi" +
                        ele.getElementsByTagName("source")[0].innerHTML;
                $.ajax({
                    url: apiURL,
                    type: 'GET',
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader("Authorization", "bearer " + keycloak.token);
                        xhr.setRequestHeader("Refresh", keycloak.refreshToken);
                    },
                    success: function (instance) {
                        for (var i in instance) {
                            var $option = $("<option>");
                            $option.text(instance[i]);
                            $option.val(instance[i]);

                            $("#" + selectName).append($option);
                        }
                    },
                    error: function (xhr, ajaxOptions, thrownError) {
                        if (xhr.status === 404) {
                            console.log(thrownError);
                        }
                    }
                });
            } else if (ele.getElementsByTagName("link").length > 0) {
                $input = $("<select>", {id: name});
                var selectName = name;
                var link = ele.getElementsByTagName("link")[0].innerHTML;
                $input.attr("data-link", link);
            } else if (ele.getElementsByTagName("options").length > 0) {
                $input = $("<select>", {id: name});
                var selectName = name;
                var options = ele.getElementsByTagName("options")[0].children;

                for (var i = 0; i < options.length; i++) {
                    var $option = $("<option>");
                    $option.text(options[i].innerHTML);
                    $option.val(options[i].innerHTML);

                    $input.append($option);
                }
            }
            if (trigger) {
                switch (type) {
                    case "text":
                        break;
                    case "button":
                        $label.attr("data-trigger", trigger);
                        $label.click(function () {
                            $("[data-condition='" + $(this).data("trigger") + "']").addClass("conditioned");
                            conditions.push($(this).data("trigger"));
                        });
                        break;
                }
            }
            if (condition) {
                $label.addClass("conditional");
                $label.attr("data-condition", condition);
            }

            $label.append($input);
            $parent.append($label);
        }
    }
    refreshLinks();
}

function factorizeRendering() {
    // Step 1: Recursively reformat elements
    var factoryArr = $("#intent-panel-body").find(".factory");
    for (var i = 0; i < factoryArr.length; i++) {
        var fact = factoryArr[i];
        var id = fact.id;
        recursivelyFactor(id, fact);
    }

    // Step 2: Check for collapsible elements
    var collapseArr = $("#intent-panel-body").find(".group-collapse-toggle");
    for (var i = 0; i < collapseArr.length; i++) {
        var toggle = collapseArr[i];
        toggle.setAttribute("data-target", toggle.getAttribute("data-target") + "_num1");

        var collapse = toggle.parentElement.nextSibling;
        collapse.id += "_num1";
    }

    // Step 3: Insert user elements
    for (var i = 0; i < factoryArr.length; i++) {
        var fact = factoryArr[i];
        var id = fact.id;
        var head = fact.children[0];
        var name = head.children[0].innerText.split(" #")[0];
        var key = id.replace(new RegExp("\\_num\\d*", "gm"), "");
        if (factories[key]["block"] === undefined) {
            var $button = $("<button>", {class: "intent-button-factory", text: "Add " + name});
            $button.attr("data-factory", key);
            $button.attr("data-target", fact.parentElement.id);
            $button.click(function (e) {
                // Modify clone for current index
                var key = $(this).data("factory");
                var target = $(this).data("target");

                buildClone(key, target);

                e.preventDefault();
            });
            $(head).append($button);
        } else {
            $(fact).attr("data-factory", key);
            $(fact).attr("data-target", fact.parentElement.id);
        }
    }

    // Step 4: Cache schemas
    for (var i = 0; i < factoryArr.length; i++) {
        var fact = factoryArr[i];
        var id = fact.id;
        var key = id.replace(new RegExp("\\_num\\d*", "gm"), "");

        factories[key]["clone"] = $(fact).clone(true, true);
    }
}
function recursivelyFactor(id, ele) {
    if (ele) {
        var arr = ele.children;
        var label = $(ele).hasClass("labeled");
        // Replace any matching IDs
        var eleID = ele.id;
        if (eleID) {
            var index = eleID.indexOf(id);
            if (index >= 0) {
                ele.id = eleID.replace(id, id + "_num1");
                if (label && ele.children[0] && ele.children[0].children[0]) {
                    if (ele.children[0].children[0].innerText.indexOf("#1") < 0) {
                        ele.children[0].children[0].innerText += " #1";
                    }
                }
            }
        }

        // Recurse
        if (arr) {
            for (var i = 0; i < arr.length; i++) {
                recursivelyFactor(id, arr[i]);
            }
        }
    }
}

// UTILITY FUNCTIONS
function collapseDiv($name, $div) {
    var name = $name.text().toLowerCase();
    var collapseStr = "collapse-" + name.replace(" ", "_");
    var $toggle = $("<a>").attr("data-toggle", "collapse")
            .attr("data-target", "#" + collapseStr)
            .addClass("group-collapse-toggle");

    var $collapseDiv = $("<div>", {class: "collapse in", id: collapseStr});

    $name.append($toggle);

    $div.append($collapseDiv);
    return $collapseDiv;
}

function prevStage() {
    if (!proceeding) {
        proceeding = true;
        var active = $activeStage.attr("id");
        var $prev = $activeStage.prev();
        if ($prev.hasClass("unreturnable")) {
            proceeding = false;
            return;
        }
        while ($prev.hasClass("conditional") && !$prev.hasClass("conditioned")) {
            $prev = $prev.prev();
            if ($prev.hasClass("unreturnable")) {
                proceeding = false;
                return;
            }
        }
        if ($prev[0].tagName !== "DIV") {
            proceeding = false;
            return;
        }

        // Update progress bar
        var $prog = $("#progressbar");
        var activeProg = $prog.children(".active")[0];
        activeProg.className = "";
        activeProg.previousElementSibling.className = "active";

        var prevID = $prev.attr("id");

        $activeStage.removeClass("active");
        $("[data-stage=" + active + "").removeClass("active");

        // Activate new rendering
        setTimeout(function () {
            $activeStage = $prev;
            $activeStage.addClass("active");
            $("[data-stage=" + prevID + "").addClass("active");
            proceeding = false;
        }, 500);
    }
}
function nextStage(flag) {
    if (!proceeding) {
        proceeding = true;

        if ($activeStage.hasClass("proceeding") && !flag) {
            proceeding = false;
            return;
        }
        var active = $activeStage.attr("id");
        var $next = $activeStage.next();
        while ($next.hasClass("conditional") && !$next.hasClass("conditioned")) {
            $next = $next.next();
        }
        if ($next.length === 0) {
            proceeding = false;
            return;
        }

        // Update progress bar
        var $prog = $("#progressbar");
        var activeProg = $prog.children(".active")[0];
        activeProg.className = "";
        activeProg.nextElementSibling.className = "active";

        var nextID = $next.attr("id");

        $activeStage.removeClass("active");
        $("[data-stage=" + active + "").removeClass("active");

        // Activate new rendering
        setTimeout(function () {
            $activeStage = $next;
            $activeStage.addClass("active");
            $("[data-stage=" + nextID + "").addClass("active");
            proceeding = false;
        }, 500);
    }
}

function getParentName(key) {
    var arr = key.split("-");
    var index = arr.length - 2;
    if (index >= 0) {
        return arr[index];
    } else {
        return null;
    }
}
function getName(key) {
    var arr = key.split("-");
    var index = arr.length - 1;
    return arr[index];
}

function constructID(ele) {
    var retString = ele.getAttribute("name");
    if (ele.nodeName === "input") {
        retString = ele.parentElement.getAttribute("name") + "-" + ele.children[0].innerHTML;
        ele = ele.parentElement;
    }
    while (ele.nodeName !== "stage") {
        retString = ele.parentElement.getAttribute("name") + "-" + retString;
        ele = ele.parentElement;
    }
    return retString.replace(" ", "_").toLowerCase();
}

function buildClone(key, target) {
    var count = ++factories[key]["count"];
    var $clone = factories[key]["clone"].clone(true, true);
    var name = getName(key);

    var header = $clone[0].children[0].children[0];
    header.innerText = header.innerText.replace("#1", "#" + count);

    var regName = new RegExp(name + "_num1", "g");
    $clone.html($clone.html().replace(regName, name + "_num" + count));
    //$clone.html($clone.html().replace(/#1/g, "#" + count));

    var regColl = new RegExp("collapse-" + name + "_num1", "g");
    $clone.html($clone.html().replace(regColl, "collapse-" + name + "_num" + count));

    // Change element attributes
    $clone.attr("id", $clone.attr("id").replace(regName, name + "_num" + count));

    // Match parent (sub-factories)
    var $target = $("#" + target);
    var $parent = $target.parent();

    if ($parent.attr("id") !== "intent-panel-body" &&
            getParentName($clone.attr("id")) !== getName($parent.attr("id"))) {
        var regParent = new RegExp(getParentName($clone.attr("id")), "g");
        $clone.attr("id", $clone.attr("id").replace(regParent, getName($parent.attr("id"))));
        $clone.html($clone.html().replace(regParent, getName($parent.attr("id"))));
    }

    // Replace control buttons    
    var $button = $("<button>", {class: "intent-button-remove close"});
    $button.attr("aria-label", "Close");
    $button.html('<span aria-hidden="true">&times;</span>');
    $button.click(function () {
        $(this).parent().parent().remove();
    });
    $clone.find("[data-factory=" + key + "]").replaceWith($button);

    $target.append($clone);

    // Reset button listeners  
    $(".intent-button-factory").off("click");
    $(".intent-button-factory").click(function (e) {
        // Modify clone for current index
        var key = $(this).data("factory");
        var target = $(this).data("target");

        buildClone(key, target);

        e.preventDefault();
    });
}

function refreshLinks() {
    var $inputArr = $("[data-link]"); 
    for (var i = 0; i < $inputArr.length; i++) {
        var $input = $inputArr[i];
        var link = $input.data("link");

        var targetArr = $(".block-" + link);
        for (var j = 0; j < targetArr.length; j++) {
            var $option = $("<option>");

            var eleID = "test"; //targetArr[i].id;
            var eleName = "test2";//$("#" + eleID + "-name").val();
            $option.text("Subnet 1 (" + eleName + ")");
            $option.val(eleID);

            $input.append($option);
        }
    }
}