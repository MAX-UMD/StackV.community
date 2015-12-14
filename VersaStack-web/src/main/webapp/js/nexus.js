
// Service JavaScript Library




// Page Load Function

$(function () {
    $("#nav").load("/VersaStack-web/navbar.html");

    $(".button-service-select").click(function (evt) {
        $ref = "srvc/" + this.id.toLowerCase() + ".jsp #service-specific";
        // console.log($ref);

        $("#service-overview").toggleClass("hide");
        $("#button-service-cancel").toggleClass("hide");
        $("#service-specific").load($ref);
        evt.preventDefault();
    });

    $("#button-service-cancel").click(function (evt) {
        $("#service-specific").empty();
        $("#button-service-cancel").toggleClass("hide");
        $("#service-overview").toggleClass("hide");

        clearCounters();
    });

    $("#button-service-return").click(function (evt) {
        window.location.href = "/VersaStack-web/ops/catalog.jsp";

        evt.preventDefault();
    });

    $(".button-group-select").click(function (evt) {
        $ref = "user_groups.jsp?id=" + this.id;
        $ref = $ref.replace('select', '') + " #group-specific";
        // console.log($ref);
        $("#group-specific").load($ref);
        evt.preventDefault();
    });

});

//Select Function
function aclSelect(sel) {
    $ref = "privileges.jsp?id=" + sel.value + " #acl-tables";
    $("#acl-tables").load($ref);
}

function installSelect(sel) {
    if (sel.value !== null) {
        $ref = "/VersaStack-web/ops/srvc/driver.jsp?form_install=" + sel.value + " #service-menu";
        $ref2 = "/VersaStack-web/ops/srvc/driver.jsp?form_install=" + sel.value + " #service-fields";
    }
    else {
        $ref = "/VersaStack-web/ops/srvc/driver.jsp #service-menu";

        $ref2 = "/VersaStack-web/ops/srvc/driver.jsp #service-fields";


    }
    $("#service-top").load($ref);
    $("#service-bottom").load($ref2);
}

function viewmodeSelect(sel) {
    if (sel.value !== null) {
        $ref = "/VersaStack-web/ops/srvc/viewcreate.jsp?mode=" + sel.value + " #service-menu";
        $ref2 = "/VersaStack-web/ops/srvc/viewcreate.jsp?mode=" + sel.value + " #service-fields";
    }
    else {
        $ref = "/VersaStack-web/ops/srvc/viewcreate.jsp #service-menu";
        $ref2 = "/VersaStack-web/ops/srvc/viewcreate.jsp #service-fields";

    }
    $("#service-top").load($ref);
    $("#service-bottom").load($ref2);
}

function driverSelect(sel) {
    if (sel.value !== null) {
        $ref = "/VersaStack-web/ops/srvc/driver.jsp?form_install=install&driver_id=" + sel.value + " #service-fields";
    }


    else
        $ref = "/VersaStack-web/ops/srvc/driver.jsp?form_install=install #service-fields";
    $("#service-bottom").load($ref);


    fieldCounter = 0;
}

function topoSelect(sel) {
    if (sel.value !== null) {

        if (sel.value.indexOf("aws") > -1) {
            $ref = "/VersaStack-web/ops/srvc/vmadd.jsp?vm_type=aws&topo=" + sel.value + " #service-fields";
        }
        else if (sel.value.indexOf("openstack") > -1) {
            $ref = "/VersaStack-web/ops/srvc/vmadd.jsp?vm_type=os #service-fields";
        }
        else if (sel.value.indexOf("versa") > -1) {
            $ref = "/VersaStack-web/ops/srvc/vmadd.jsp?vm_type=vs #service-fields";
        }
        else {
            $ref = "/VersaStack-web/ops/srvc/vmadd.jsp #service-fields";
        }
    }
    else
        $ref = "/VersaStack-web/ops/srvc/vmadd.jsp #service-fields";

    $("#service-bottom").load($ref);
}



function instanceSelect(sel) {
    if (sel.value !== null) {
        if (sel.value === "instance1") {
            document.getElementsByName("root-path")[0].value = "/dev/xvda";
            document.getElementsByName("root-snapshot")[0].value = "snapshot";
        }
        else if (sel.value === "instance2") {
            document.getElementsByName("root-path")[0].value = "/dev/sdb";
            document.getElementsByName("root-snapshot")[0].value = "snapshot";
        }
        else if (sel.value === "instance3") {
            document.getElementsByName("root-path")[0].value = "/dev/sdc";
            document.getElementsByName("root-snapshot")[0].value = "snapshot";
        }
    }
}

// Field Addition Functions
var fieldCounter = 0;
var fieldLimit = 5;
function addPropField() {
    if (fieldCounter === fieldLimit) {
        alert("You have reached the limit of additional properties");
    }
    else {
        var table = document.getElementById("service-form");
        var tableHeight = table.rows.length;

        var row = table.insertRow(tableHeight - 1);
        var cell1 = row.insertCell(0);
        var cell2 = row.insertCell(1);
        fieldCounter++;
        cell1.innerHTML = '<input type="text" name="apropname'
                + (fieldCounter) + '" placeholder="Additional Property Name" size="30" />';

        cell2.innerHTML = '<input type="text" name="apropval'
                + (fieldCounter) + '" placeholder="Additional Property Value" size="30" />';

    }

}

var volumeCounter = 0;
var volumeLimit = 10;
function addVolume() {
    if (volumeCounter === volumeLimit) {
        alert("You have reached the limit of volumes.");
    }
    else {
        var table = document.getElementById("volume-table");
        var tableHeight = table.rows.length;

        var row = table.insertRow(tableHeight);
        var cell1 = row.insertCell(0);
        var cell2 = row.insertCell(1);
        var cell3 = row.insertCell(2);
        var cell4 = row.insertCell(3);
        var cell5 = row.insertCell(4);
        volumeCounter++;
        cell1.innerHTML = 'Volume ' + volumeCounter;
        cell2.innerHTML = '<select name="' + volumeCounter + '-path" required>'
                + '<option></option>'
                + '<option value="/dev/xvda">/dev/xvda</option>'
                + '<option value="/dev/sdb">/dev/sdb</option>'
                + '<option value="/dev/sdc">/dev/sdc</option>'
                + '</select>';
        cell3.innerHTML = '<select name="' + volumeCounter + '-snapshot" required>'
                + '<option></option>'
                + '<option value="snapshot1">snapshot</option>'
                + '<option value="snapshot1">snapshot2</option>'
                + '<option value="snapshot1">snapshot3</option>'
                + '</select>';
        cell4.innerHTML = '<input type="number" name="' + volumeCounter + '-size" style="width: 4em; text-align: center;"/>';
        cell5.innerHTML = '<select name="' + volumeCounter + '-type" required>'
                + '<option></option>'
                + '<option value="standard">Standard</option>'
                + '<option value="io1">io1</option>'
                + '<option value="gp2">gp2</option>'
                + '</select>'
                + '<input type="button" class="button-register" value="Remove" onClick="removeVolume(' + tableHeight + ')" />';

    }
}

function removeVolume(row) {
    var table = document.getElementById("volume-table");
    table.deleteRow(row);
}

function openWizard(button) {
    var queryID = button.id.substr(7);

    document.getElementById("wizard-table").toggleClass("hide");
    document.getElementById("queryNumber").value = queryID;
}

function applyTextTemplate(name) {
    var template = document.getElementById(name + "Template");
    var input = document.getElementById(name + "Input");
    var queryNumber = document.getElementById("queryNumber");

    var output = document.getElementById("sparquery" + queryNumber.value);
    output.value = template.value + input.value;
}

function applySelTemplate(name) {
    var template = document.getElementById(name + "Template");
    var input = document.getElementById(name + "Input");
    var output = document.getElementById("sparquery");

    output.value = template.value + input.options[input.selectedIndex].value;
}

var queryCounter = 1;
var queryLimit = 10;
function addQuery() {
    if (queryCounter === queryLimit) {
        alert("You have reached the limit of querys.");
    }
    else {
        var table = document.getElementById("net-custom-form");
        var tableHeight = table.rows.length;

        var row = table.insertRow(tableHeight - 2);
        var cell1 = row.insertCell(0);
        var cell2 = row.insertCell(1);
        queryCounter++;
        cell1.innerHTML = '<input type="text" id="sparquery' + queryCounter + '" name="sparquery' + queryCounter + '" size="70" />';
        cell2.innerHTML = '<div class="view-flag">'
                + '<input type="checkbox" id="inc' + queryCounter + '" name="viewInclusive' + queryCounter + '"/><label for="inc' + queryCounter + '">Inclusive</label>'
                + '</div><div class="view-flag">'
                + '<input type="checkbox" id="sub' + queryCounter + '" name="subRecursive' + queryCounter + '"/><label for="sub' + queryCounter + '">Subtree Rec.</label>'
                + '</div><div class="view-flag">'
                + '<input type="checkbox" id="sup' + queryCounter + '" name="supRecursive' + queryCounter + '"/><label for="sup' + queryCounter + '">Supertree Rec.</label></div>';
    }
}

var routeCounter = 1;
var routeLimit = 10;
function addRoute() {
    if (routeCounter === routeLimit) {
        alert("You have reached the limit of routes.");
    }
    else {        
        routeCounter++;
        var block = document.getElementById('route-block');

        block.innerHTML = block.innerHTML + 
                '<div>' + 
                '<input type="text" name="route' + routeCounter + '-from" placeholder="From"/>' +
                '<input type="text" name="route' + routeCounter + '-to" placeholder="To"/>' +
                '<input type="text" name="route' + routeCounter + '-next" placeholder="Next Hop"/>' +
                '</div>';
    }
}

var subnetCounter = 1;
var subnetLimit = 10;
function addSubnet() {
     if (subnetCounter === subnetLimit) {
        alert("You have reached the limit of subnets.");
    }
    else {
        var table = document.getElementById("net-custom-form");
        var tableHeight = table.rows.length;
        subnetCounter++;

        var row = table.insertRow(tableHeight - 1);
        row.id = 'subnet' + subnetCounter;
        
        var cell1 = row.insertCell(0);
        cell1.innerHTML = 'Subnet ' + subnetCounter;
        var cell2 = row.insertCell(1);               
        cell2.innerHTML = '<div>' +
                '<input type="text" name="subnet' + subnetCounter + '-name" placeholder="Name"/>' +
                '<input type="text" name="subnet' + subnetCounter + '-cidr" placeholder="CIDR Block"/>' +
                '<div id="subnet' + subnetCounter + '-route-block">' +
                '<div>' +
                '<input type="text" name="subnet' + subnetCounter + '-route1-from" placeholder="From"/>\n' +
                '<input type="text" name="subnet' + subnetCounter + '-route1-to" placeholder="To"/>\n' +
                '<input type="text" name="subnet' + subnetCounter + '-route1-next" placeholder="Next Hop"/>\n' +
                '</div>' +
                '</div>' +
                '<div>' +
                '<input type="checkbox" name="subnet' + subnetCounter + '-route-prop" value="true"/>   Enable VPN Routes Propogation' +
                '</div>' +
                '<div>' +
                '<input class="button-register" id="subnet' + subnetCounter + '-route" type="button" value="Add Route" onClick="addSubnetRoute(this.id)">' +
                '</div>' +
                '</div>';
    }
}

var subRouteCounter = 1;
var subRouteLimit = 10;
function addSubnetRoute(subnetNum) {
    if (subRouteCounter === subRouteLimit) {
        alert("You have reached the limit of routes.");
    }
    else {        
        subRouteCounter++;
        var block = document.getElementById(subnetNum + '-block');

        block.innerHTML = block.innerHTML + 
                '<div>' + 
                '<input type="text" name="' + subnetNum + subRouteCounter + '-from" placeholder="From"/>' +
                '<input type="text" name="' + subnetNum + subRouteCounter + '-to" placeholder="To"/>' +
                '<input type="text" name="' + subnetNum + subRouteCounter + '-next" placeholder="Next Hop"/>' +
                '</div>';
    }

}

function propagateInstance(uuid) {
    var apiUrl = 'http://localhost:8080/VersaStack-web/restapi/service/' + uuid + '/propagate';
    $.ajax({
        url: apiUrl,
        type: 'PUT',
        success: function (result) {
            // Do something with the result
        }
    });
}

function commitInstance(uuid) {
    var apiUrl = 'http://localhost:8080/VersaStack-web/restapi/service/' + uuid + '/commit';
    $.ajax({
        url: apiUrl,
        type: 'PUT',
        success: function (result) {
            // Do something with the result
        }
    });
}

function revertInstance(uuid) {
    var apiUrl = 'http://localhost:8080/VersaStack-web/restapi/service/' + uuid + '/revert';
    $.ajax({
        url: apiUrl,
        type: 'PUT',
        success: function (result) {
            // Do something with the result
        }
    });
}

/*
 function clearView() {
 localStorage.removeItem('queryJSON');
 
 evt.preventDefault();
 }
 
 function newQuery() {
 $("#query-table").toggleClass("hide");
 
 evt.preventDefault();
 }
 
 function addQuery() {
 var json = localStorage.getItem('queryJSON');
 if (json === null) {
 var arr = [document.getElementById("sparquery").value];
 } 
 else {        
 var arr = JSON.parse(json);
 arr.push(document.getElementById("sparquery").value);
 }
 var newJSON = JSON.stringify(arr);
 localStorage.setItem('queryJSON', newJSON);
 
 $("#service-bottom").load("/VersaStack-web/ops/srvc/viewcreate.jsp?mode=create #service-fields");
 }*/



// Utility Functions


function clearCounters() {
    volumeCounter = 0;
    fieldCounter = 0;
}
