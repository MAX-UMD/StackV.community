/* 
 * Copyright (c) 2013-2016 University of Maryland
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

/* global XDomainRequest, baseUrl, loggedIn */

// Service JavaScript Library
baseUrl = window.location.origin;
var keycloak = Keycloak('/StackV-web/data/json/keycloak.json');

// Page Load Function

$(function () {
    keycloak.init().success(function (authenticated) {
        if (authenticated) {
            var test = keycloak.isTokenExpired();
            loggedIn = authenticated ? true : false;
            sessionStorage.setItem("loggedIn", loggedIn);
            if (loggedIn) {
                sessionStorage.setItem("username", keycloak.tokenParsed.given_name);
                sessionStorage.setItem("subject", keycloak.tokenParsed.sub);
                sessionStorage.setItem("token", keycloak.token);
            }
        } else {
            keycloak.login();
        }
    }).error(function () {
        alert('failed to initialize');
    });
    keycloak.onAuthSuccess = function () {
        // catalog
        if (window.location.pathname === "/StackV-web/ops/catalog.jsp") {
            setTimeout(catalogLoad, 750);
            setRefreshTracker(60);
        }
        // templateDetails
        else if (window.location.pathname === "/StackV-web/ops/details/templateDetails.jsp") {
            var uuid = getURLParameter("uuid");

            deltaModerate();
            instructionModerate();
            buttonModerate();
            loadACL(uuid);
            loadStatus(uuid);
            loadVisualization();
            setRefreshInstance(60);
        }
    };
    keycloak.onTokenExpire = function () {
        keycloak.updateToken(20).success(function () {
            console.log("Token automatically updated!");
        }).error(function () {
            console.log("Automatic token update failed!");
        });
    };
    
    

    $("#nav").load("/StackV-web/navbar.html", function () {
        $("#logout-button").click(function (evt) {
            keycloak.logout();

            evt.preventDefault();
        });
        $("#account-button").click(function (evt) {
            keycloak.accountManagement();

            evt.preventDefault();
        });
    });
    $("#sidebar").load("/StackV-web/sidebar.html", function () {
        $("#sidebar-toggle").click(function (evt) {
            $("#sidebar-toggle-1").toggleClass("img-off");
            $("#sidebar-toggle-2").toggleClass("img-off");

            $("#sidebar-contents").toggleClass("sidebar-open");
            $("#main-pane").toggleClass("sidebar-open");

            evt.preventDefault();
        });
    });

    $("#button-service-cancel").click(function (evt) {
        $("#service-specific").empty();
        $("#button-service-cancel").toggleClass("hide");
        $("#service-overview").toggleClass("hide");

        clearCounters();
    });

    $("#button-service-return").click(function (evt) {
        window.location.href = "/StackV-web/ops/catalog.jsp";

        evt.preventDefault();
    });

    $(".button-group-select").click(function (evt) {
        $ref = "user_groups.jsp?id=" + this.id;
        $ref = $ref.replace('select', '') + " #group-specific";
        // console.log($ref);
        $("#group-specific").load($ref);
        evt.preventDefault();
    });

    $(".clickable-row").click(function () {
        window.document.location = $(this).data("href");
    });

    $(".delta-table-header").click(function () {
        $("#body-" + this.id).toggleClass("hide");
    });

    $("#black-screen").click(function () {
        $("#black-screen").addClass("off");
        $("#info-panel").removeClass("active");
    });

    $(".nav-tabs li").click(function () {
        if ($(this).parent().parent().hasClass("closed")) {
            $("#catalog-panel").removeClass("closed");
        } else if (this.className === 'active') {
            $("#catalog-panel").toggleClass("closed");
        }
    });

    clearCounters();
});

function detailsLoad() {
    var uuid = getUrlParameter('uuid');
    $ref = "/StackV-web/ops/details/dncDetails.jsp?uuid=" + uuid + " #instance-pane";

    $("service-specific").load($ref);
}
function prettyPrintInfo() {
    var ugly = document.getElementById('info-panel-text-area').value;
    var obj = JSON.parse(ugly);
    var pretty = JSON.stringify(obj, undefined, 4);
    document.getElementById('info-panel-text-area').value = pretty;
}

//Select Function
function aclSelect(sel) {
    $ref = "privileges.jsp?id=" + sel.value + " #acl-tables";
    $("#acl-tables").load($ref);
}

function installSelect(sel) {
    if (sel.value !== null) {
        $ref = "/StackV-web/ops/srvc/driver.jsp?form_install=" + sel.value + " #service-menu";
        $ref2 = "/StackV-web/ops/srvc/driver.jsp?form_install=" + sel.value + " #service-fields";
    } else {
        $ref = "/StackV-web/ops/srvc/driver.jsp #service-menu";

        $ref2 = "/StackV-web/ops/srvc/driver.jsp #service-fields";


    }
    $("#service-top").load($ref);
    $("#service-bottom").load($ref2);
}

function viewmodeSelect(sel) {
    if (sel.value !== null) {
        $ref = "/StackV-web/ops/srvc/viewcreate.jsp?mode=" + sel.value + " #service-menu";
        $ref2 = "/StackV-web/ops/srvc/viewcreate.jsp?mode=" + sel.value + " #service-fields";
    } else {
        $ref = "/StackV-web/ops/srvc/viewcreate.jsp #service-menu";
        $ref2 = "/StackV-web/ops/srvc/viewcreate.jsp #service-fields";

    }
    $("#service-top").load($ref);
    $("#service-bottom").load($ref2);

    clearCounters();
}

function driverSelect(sel) {
    if (sel.value !== null) {
        $ref = "/StackV-web/ops/srvc/driver.jsp?form_install=install&driver_id=" + sel.value + " #service-fields";
    } else
        $ref = "/StackV-web/ops/srvc/driver.jsp?form_install=install #service-fields";
    $("#service-bottom").load($ref);


    fieldCounter = 0;
}

function topoSelect(sel) {
    if (sel.value !== null) {

        if (sel.value.indexOf("aws") > -1) {
            $ref = "/StackV-web/ops/srvc/vmadd.jsp?vm_type=aws&topo=" + sel.value + " #service-fields";
        } else if (sel.value.indexOf("openstack") > -1) {
            $ref = "/StackV-web/ops/srvc/vmadd.jsp?vm_type=os #service-fields";
        } else if (sel.value.indexOf("versa") > -1) {
            $ref = "/StackV-web/ops/srvc/vmadd.jsp?vm_type=vs #service-fields";
        } else {
            $ref = "/StackV-web/ops/srvc/vmadd.jsp #service-fields";
        }
    } else
        $ref = "/StackV-web/ops/srvc/vmadd.jsp #service-fields";

    $("#service-bottom").load($ref);

    clearCounters();
}



function instanceSelect(sel) {
    if (sel.value !== null) {
        if (sel.value === "instance1") {
            document.getElementsByName("root-path")[0].value = "/dev/xvda";
            document.getElementsByName("root-snapshot")[0].value = "snapshot";
        } else if (sel.value === "instance2") {
            document.getElementsByName("root-path")[0].value = "/dev/sdb";
            document.getElementsByName("root-snapshot")[0].value = "snapshot";
        } else if (sel.value === "instance3") {
            document.getElementsByName("root-path")[0].value = "/dev/sdc";
            document.getElementsByName("root-snapshot")[0].value = "snapshot";
        }
    }
}

function networkSelect(sel) {
    if (sel.value !== null) {
        $ref2 = "/StackV-web/ops/srvc/netcreate.jsp?networkType=" + sel.value + " #service-fields";
    } else {
        $ref2 = "/StackV-web/ops/srvc/netcreate.jsp #service-fields";
    }
    $("#service-bottom").load($ref2);

    clearCounters();
}

// Field Addition Functions
var fieldCounter = 0;
var fieldLimit = 5;
function addPropField() {
    if (fieldCounter === fieldLimit) {
        alert("You have reached the limit of additional properties");
    } else {
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
    } else {
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
    } else {
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
    } else {
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

var subRouteCounter = 1;
var subRouteLimit = 10;
function addSubnetRoute(subnetID) {
    if (subRouteCounter === subRouteLimit) {
        alert("You have reached the limit of routes.");
        return;
    }

    subRouteCounter++;
    var block = document.getElementById(subnetID + '-block');

    block.innerHTML = block.innerHTML +
            '<div>' +
            '<input type="text" name="' + subnetID + subRouteCounter + '-from" placeholder="From"/>' +
            '<input type="text" name="' + subnetID + subRouteCounter + '-to" placeholder="To"/>' +
            '<input type="text" name="' + subnetID + subRouteCounter + '-next" placeholder="Next Hop"/>' +
            '</div>';
}

//var VMRouteCounter = 1;
//var VMRouteLimit = 10;
//function addVMRoute(VMID) {
//    if (VMRouteCounter === VMRouteLimit) {
//        alert("You have reached the limit of routes.");
//    }
//
//    VMRouteCounter++;
//    var block = document.getElementById(VMID + '-block');
//
//    block.innerHTML = block.innerHTML +
//            '<div>' +
//            '<input type="text" name="' + VMID + VMRouteCounter + '-from" placeholder="From"/>' +
//            '<input type="text" name="' + VMID + VMRouteCounter + '-to" placeholder="To"/>' +
//            '<input type="text" name="' + VMID + VMRouteCounter + '-next" placeholder="Next Hop"/>' +
//            '</div>';
//}

var SRIOVCounter = 1;
var SRIOVLimit = 10;
function addSRIOV(VMID) {
    if (SRIOVCounter === SRIOVLimit) {
        alert("You have reached the limit of SRIOV connections.");
        return;
    }

    SRIOVCounter++;
    var block = document.getElementById(VMID + '-block');

    block.innerHTML = block.innerHTML +
            '<div>' +
            '<input type="text" name="' + VMID + SRIOVCounter + '-mac" placeholder="SRIOV MAC Address">' +
            '<input type="text" name="' + VMID + SRIOVCounter + '-ip" placeholder="SRIOV IP Address">' +
            '<input type="text" name="' + VMID + SRIOVCounter + '-gateway" placeholder="SRIOV Gateway">' +
            '</div><div id="' + VMID + SRIOVCounter + '-route-block"></div><div>' +
            '<input class="button-register" id="' + VMID + SRIOVCounter + '-route" type="button" value="Add Route" onClick="addSRIOVRoute(this.id)">';

    addSRIOVRoute(VMID + SRIOVCounter + '-route');
}

var SRIOVRouteCounter = 1;
var SRIOVRouteLimit = 20;
function addSRIOVRoute(SRIOVRouteId) {
    if (SRIOVRouteCounter === SRIOVRouteLimit) {
        alert("You have reached the limit of SRIOV routes.");
        return;
    }

    SRIOVRouteCounter++;
    var block = document.getElementById(SRIOVRouteId + '-block');

    block.innerHTML = block.innerHTML +
            '<div>' +
            '<input type="text" name="' + SRIOVRouteId + SRIOVRouteCounter + '-from" placeholder="From">' +
            '<input type="text" name="' + SRIOVRouteId + SRIOVRouteCounter + '-to" placeholder="To">' +
            '<input type="text" name="' + SRIOVRouteId + SRIOVRouteCounter + '-next" placeholder="Next Hop">' +
            '</div>';
}

var VMCounter = 1;
var VMLimit = 10;
function addVM(type, subnetID) {
    if (VMCounter === VMLimit) {
        alert("You have reached the limit of VMs.");
        return;
    } else if (type === 'aws') {
        VMCounter++;
        var block = document.getElementById(subnetID + '-block');

        block.innerHTML = block.innerHTML +
                '<table id="' + subnetID + VMCounter + '-table">' +
                '<tbody>' +
                '<tr><td>VM Name</td><td><input type="text" name="' + subnetID + VMCounter + '"></td></tr>' +
                '<tr><td><input type="text" name="' + subnetID + VMCounter + '-keypair" placeholder="Keypair Name"></td>' +
                '<td><input type="text" name="' + subnetID + VMCounter + '-security" placeholder="Security Group"></td></tr>' +
                '<tr><td><input type="text" name="' + subnetID + VMCounter + '-image" placeholder="Image Type"></td>' +
                '<td><input type="text" name="' + subnetID + VMCounter + '-instance" placeholder="Instance Type"></td></tr>' +
                '</tbody></table>';
    } else if (type === 'ops') {
        VMCounter++;
        var block = document.getElementById(subnetID + '-block');

        block.innerHTML = block.innerHTML +
                '<table id="' + subnetID + VMCounter + '-table">' +
                '<tbody>' +
                '<tr><td>VM Name</td><td><input type="text" name="' + subnetID + VMCounter + '"></td></tr>' +
                '<tr><td><input type="text" name="' + subnetID + VMCounter + '-keypair" placeholder="Keypair Name"></td>' +
                '<td><input type="text" name="' + subnetID + VMCounter + '-security" placeholder="Security Group"></td></tr>' +
                '<tr><td><input type="text" name="' + subnetID + VMCounter + '-image" placeholder="Image Type"></td>' +
                '<td><input type="text" name="' + subnetID + VMCounter + '-instance" placeholder="Instance Type"></td></tr>' +
                '<tr><td><input type="text" name="' + subnetID + VMCounter + '-host" placeholder="VM Host"></td>' +
                '<td><input type="text" name="' + subnetID + VMCounter + '-floating" placeholder="Floating IP"></td></tr>' +
                '<tr><td>SRIOV</td><td>' +
                '<div id="' + subnetID + VMCounter + '-sriov-block">' +
                '</div><div><input class="button-register" id="' + subnetID + VMCounter + '-sriov" type="button" value="Add SRIOV" onClick="addSRIOV(this.id)"></div>' +
                '</td></tr></tbody></table>';

//        addVMRoute(subnetID + VMCounter + '-route');
        addSRIOV(subnetID + VMCounter + '-sriov');
    }
}

var gatewayCounter = 1;
var gatewarLimit = 5;
function addGateway(gatewayID) {
    if (gatewayCounter === gatewarLimit) {
        alert("You have reached the limit of Gateways.");
        return;
    }
    gatewayCounter++;
    var block = document.getElementById(gatewayID + '-block');

    block.innerHTML = block.innerHTML +
            '<table id="' + gatewayID + gatewayCounter + '-table">' +
            '<tbody>' +
            '<tr><td>Name</td>' +
            '<td><input type="text" name="' + gatewayID + gatewayCounter + '"></td></tr>' +
            '<tr><td>From</td>' +
            '<td><input type="text" name="' + gatewayID + gatewayCounter + '-from-value" placeholder="Value"></td>' +
            '<td><input type="text" name="' + gatewayID + gatewayCounter + '-from-type" placeholder="Type"></td></tr>' +
            '<tr><td>To</td>' +
            '<td><input type="text" name="' + gatewayID + gatewayCounter + '-to-value" placeholder="Value"></td>' +
            '<td><input type="text" name="' + gatewayID + gatewayCounter + '-to-type" placeholder="Type"></td></tr>' +
            '</tbody></table>';
}

var subnetCounter = 1;
var subnetLimit = 10;
function addSubnet(type) {
    if (subnetCounter === subnetLimit) {
        alert("You have reached the limit of subnets.");
        return;
    } else if (type === 'aws') {
        var table = document.getElementById("net-custom-form");
        var tableHeight = table.rows.length;
        subnetCounter++;

        var row = table.insertRow(tableHeight - 2);
        row.id = 'subnet' + subnetCounter;

        var cell1 = row.insertCell(0);
        cell1.innerHTML = 'Subnet ' + subnetCounter;
        var cell2 = row.insertCell(1);
        cell2.innerHTML = '<div>' +
                '<input type="text" name="subnet' + subnetCounter + '-name" placeholder="Name"/>' +
                '<input type="text" name="subnet' + subnetCounter + '-cidr" placeholder="CIDR Block"/>' +
                '<div id="subnet' + subnetCounter + '-route-block"></div>' +
                '<div>' +
                '<input type="checkbox" name="subnet' + subnetCounter + '-route-prop" value="true"/>   Enable VPN Routes Propogation' +
                '</div>' +
                '<div>' +
                '<input class="button-register" id="subnet' + subnetCounter + '-route" type="button" value="Add Route" onClick="addSubnetRoute(this.id)">' +
                '</div><br>' +
                '<div id="subnet' + subnetCounter + '-vm-block"></div>' +
                '<div>' +
                '<input class="button-register" id="subnet' + subnetCounter + '-vm" type="button" value="Add VM" onClick="addVM(\'aws\', this.id)">' +
                '</div>' +
                '</div>';

        addSubnetRoute('subnet' + subnetCounter + '-route');
        addVM('aws', 'subnet' + subnetCounter + '-vm');
    } else if (type === 'ops') {
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
                '<div id="subnet' + subnetCounter + '-route-block"></div>' +
                '<div>' +
                '<input type="checkbox" name="subnet' + subnetCounter + '-route-prop" value="true"/>   Enable VPN Routes Propogation' +
                '</div>' +
                '<div>' +
                '<input class="button-register" id="subnet' + subnetCounter + '-route" type="button" value="Add Route" onClick="addSubnetRoute(this.id)">' +
                '</div><br>' +
                '<div id="subnet' + subnetCounter + '-vm-block"></div>' +
                '<div>' +
                '<input class="button-register" id="subnet' + subnetCounter + '-vm" type="button" value="Add VM" onClick="addVM(\'ops\', this.id)"></div>' +
                '</div>';

        addSubnetRoute('subnet' + subnetCounter + '-route');
        addVM('ops', 'subnet' + subnetCounter + '-vm');
    }
}

var linkCounter = 1;
var linkLimit = 10;
function addLink() {
    if (linkCounter === linkLimit) {
        alert("You have reached the limit of connections");
    } else {
        var table = document.getElementById("net-custom-form");
        var tableHeight = table.rows.length;
        linkCounter++;

        var row = table.insertRow(tableHeight - 1);
        row.id = 'link' + linkCounter;

        var cell1 = row.insertCell(0);
        cell1.innerHTML = 'Link ' + linkCounter;
        var cell2 = row.insertCell(1);
        cell2.innerHTML = '<div>' +
                '<input type="text" name="linkUri' + linkCounter + '"size="60" placeholder="Link-URI">' +
                '</div>' +
                '<div>' +
                '<input type="text" name="link' + linkCounter + '-src" size="60" placeholder="Source">' +
                '<input type="text" name="link' + linkCounter + '-src-vlan" placeholder="Vlan-tag">' +
                '</div>' +
                '</div>' +
                '<input type="text" name="link' + linkCounter + '-des" size="60" placeholder="Destination">' +
                '<input type="text" name="link' + linkCounter + '-des-vlan" placeholder="Vlan-tag">' +
                '</div>';
    }
}


/* API CALLS */

function checkInstance(uuid) {
    var apiUrl = baseUrl + '/StackV-web/restapi/service/' + uuid + '/status';
    $.ajax({
        url: apiUrl,
        type: 'GET',
        success: function (result) {
            var statusElement = document.getElementById("instance-status");
            statusElement.innerHTML = result;
        }
    });
}

function propagateInstance(uuid) {
    var apiUrl = baseUrl + '/StackV-web/restapi/app/service/' + uuid + '/propagate';
    $.ajax({
        url: apiUrl,
        type: 'PUT',
        success: function (result) {
            window.location.reload(true);
        }
    });
}

function commitInstance(uuid) {
    var apiUrl = baseUrl + '/StackV-web/restapi/app/service/' + uuid + '/commit';
    $.ajax({
        url: apiUrl,
        type: 'PUT',
        success: function (result) {
            window.location.reload(true);
        }
    });
}

function revertInstance(uuid) {
    var apiUrl = baseUrl + '/StackV-web/restapi/app/service/' + uuid + '/revert';
    $.ajax({
        url: apiUrl,
        type: 'PUT',
        success: function (result) {
            window.location.reload(true);
        }
    });
    //window.location.replace('/StackV-web/ops/catalog.jsp');
}

function cancelInstance(uuid) {
    var apiUrl = baseUrl + '/StackV-web/restapi/app/service/' + uuid + '/cancel';
    $.ajax({
        url: apiUrl,
        type: 'PUT',
        success: function (result) {
            window.location.reload(true);
        }
    });
    //window.location.replace('/StackV-web/ops/catalog.jsp');
}
function forceCancelInstance(uuid) {
    var apiUrl = baseUrl + '/StackV-web/restapi/app/service/' + uuid + '/force_cancel';
    $.ajax({
        url: apiUrl,
        type: 'PUT',
        success: function (result) {
            window.location.reload(true);
        }
    });
    //window.location.replace('/StackV-web/ops/catalog.jsp');
}

function reinstateInstance(uuid) {
    var apiUrl = baseUrl + '/StackV-web/restapi/app/service/' + uuid + '/reinstate';
    $.ajax({
        url: apiUrl,
        type: 'PUT',
        success: function (result) {
            window.location.reload(true);
        }
    });
    //window.location.replace('/StackV-web/ops/catalog.jsp');
}
function forceReinstateInstance(uuid) {
    var apiUrl = baseUrl + '/StackV-web/restapi/app/service/' + uuid + '/force_reinstate';
    $.ajax({
        url: apiUrl,
        type: 'PUT',
        success: function (result) {
            window.location.reload(true);
        }
    });
    //window.location.replace('/StackV-web/ops/catalog.jsp');
}

function forceRetryInstance(uuid) {
    var apiUrl = baseUrl + '/StackV-web/restapi/app/service/' + uuid + '/force_retry';
    $.ajax({
        url: apiUrl,
        type: 'PUT',
        success: function (result) {
            window.location.reload(true);
        }
    });
    //window.location.replace('/StackV-web/ops/catalog.jsp');
}

function modifyInstance(uuid) {
    var apiUrl = baseUrl + '/StackV-web/restapi/app/service/' + uuid + '/modify';
    $.ajax({
        url: apiUrl,
        type: 'PUT',
        success: function (result) {
            window.location.reload(true);
        }
    });
    //window.location.replace('/StackV-web/ops/catalog.jsp');
}
function forceModifyInstance(uuid) {
    var apiUrl = baseUrl + '/StackV-web/restapi/app/service/' + uuid + '/force_modify';
    $.ajax({
        url: apiUrl,
        type: 'PUT',
        success: function (result) {
            window.location.reload(true);
        }
    });
    //window.location.replace('/StackV-web/ops/catalog.jsp');
}

function verifyInstance(uuid) {
    var apiUrl = baseUrl + '/StackV-web/restapi/app/service/' + uuid + '/verify';
    $.ajax({
        url: apiUrl,
        type: 'PUT',
        success: function (result) {
            window.location.reload(true);
        }
    });
    //window.location.replace('/StackV-web/ops/catalog.jsp');
}

function deleteInstance(uuid) {
    var apiUrl = baseUrl + '/StackV-web/restapi/app/service/' + uuid + '/delete';
    $.ajax({
        url: apiUrl,
        type: 'PUT',
        success: function (result) {
            console.log("DELETION SUCCESSFUL");
            window.location.replace('/StackV-web/ops/catalog.jsp');
        }
    });
}

// TEMPLATING

function resetForm() {
    var form = document.getElementById('custom-form');
    form.reset();
}

function applyNetTemplate(code) {
    var form = document.getElementById('custom-form');
    form.reset();

    switch (code) {
        case 1:
            form.elements['netType'].value = 'internal';
            form.elements['netCidr'].value = '10.1.0.0/16';

            if (subRouteCounter === 1) {
                addSubnetRoute('subnet1-route');
            }
            if (subnetCounter === 1) {
                addSubnet('aws');
            }

            form.elements['subnet1-name'].value = '';
            form.elements['subnet1-cidr'].value = '10.1.0.0/24';
            form.elements['subnet1-route1-to'].value = '206.196.0.0/16';
            form.elements['subnet1-route1-next'].value = 'internet';

            form.elements['subnet1-route2-to'].value = '72.24.24.0/24';
            form.elements['subnet1-route2-next'].value = 'vpn';
            form.elements['subnet1-route-prop'].checked = true;

            form.elements['subnet2-name'].value = '';
            form.elements['subnet2-cidr'].value = '10.1.1.0/24';

            break;

        case 2:
            form.elements['netType'].value = 'internal';
            form.elements['netCidr'].value = '10.1.0.0/16';

            if (subRouteCounter === 1) {
                addSubnetRoute('subnet1-route');
            }
            if (subnetCounter === 1) {
                addSubnet('aws');
            }

            form.elements['subnet1-name'].value = '';
            form.elements['subnet1-cidr'].value = '10.1.0.0/24';
            form.elements['subnet1-route1-to'].value = '206.196.0.0/16';
            form.elements['subnet1-route1-next'].value = 'internet';
            form.elements['subnet1-route2-to'].value = '72.24.24.0/24';
            form.elements['subnet1-route2-next'].value = 'vpn';
            form.elements['subnet1-route-prop'].checked = true;
            form.elements['subnet1-vm1'].value = 'vm1';


            form.elements['subnet2-name'].value = '';
            form.elements['subnet2-cidr'].value = '10.1.1.0/24';
            form.elements['subnet2-vm2'].value = 'vm2';

            form.elements['conn-dest'].value = 'urn:ogf:network:domain=dragon.maxgigapop.net:node=CLPK:port=1-1-2:link=*';
            form.elements['conn-vlan'].value = 'any';

            break;

        case 3:
            form.elements['netType'].value = 'internal';
            form.elements['netCidr'].value = '10.1.0.0/16';

            if (subRouteCounter === 1) {
                addSubnetRoute('subnet1-route');
            }
            if (subnetCounter === 1) {
                addSubnet('aws');
            }

            form.elements['subnet1-name'].value = '';
            form.elements['subnet1-cidr'].value = '10.1.0.0/24';

            form.elements['subnet1-route1-to'].value = '206.196.0.0/16';
            form.elements['subnet1-route1-next'].value = 'internet';
            form.elements['subnet1-route2-to'].value = '72.24.24.0/24';
            form.elements['subnet1-route2-next'].value = 'vpn';
            form.elements['subnet1-route-prop'].checked = true;

            form.elements['subnet1-vm1'].value = 'test_with_vm_types_1';
            form.elements['subnet1-vm1-image'].value = 'ami-08111162';
            form.elements['subnet1-vm1-instance'].value = 't2.micro';

            form.elements['subnet2-name'].value = '';
            form.elements['subnet2-cidr'].value = '10.1.1.0/24';

            form.elements['subnet2-vm2'].value = 'test_with_vm_types_2';
            form.elements['subnet2-vm2-image'].value = 'ami-fce3c696';
            form.elements['subnet2-vm2-instance'].value = 't2.small';
            form.elements['subnet2-vm2-keypair'].value = 'xi-aws-max-dev-key';
            form.elements['subnet2-vm2-security'].value = 'geni';

            break;

        case 4:
            form.elements['netType'].value = 'internal';
            form.elements['netCidr'].value = '10.1.0.0/16';

//            if (subRouteCounter === 1) {
//                addSubnetRoute('subnet1-route');
//            }
//            if (subnetCounter === 1) {
//                addSubnet('ops');
//            }

            form.elements['subnet1-name'].value = '';
            form.elements['subnet1-cidr'].value = '10.1.0.0/24';

//            form.elements['subnet1-route1-to'].value = '206.196.0.0/16';
//            form.elements['subnet1-route1-next'].value = 'internet';
//            form.elements['subnet1-route2-to'].value = '72.24.24.0/24';
//            form.elements['subnet1-route2-next'].value = 'vpn';
            form.elements['subnet1-route-default'].checked = true;

            form.elements['subnet1-vm1'].value = 'vm_OPS';
//            form.elements['subnet1-vm1-instance'].value = 'm1.medium';
//            form.elements['subnet1-vm1-keypair'].value = 'icecube_key';
//            form.elements['subnet1-vm1-security'].value = 'rains';
            form.elements['subnet1-vm1-host'].value = 'msx1';

//            form.elements['subnet2-name'].value = '';
//            form.elements['subnet2-cidr'].value = '10.1.1.0/24';
//            
            break;

        case 5:
            form.elements['netType'].value = 'internal';
            form.elements['netCidr'].value = '10.1.0.0/16';

            if (VMRouteCounter === 1) {
                addVMRoute('subnet1-vm1-route');
            }

            form.elements['subnet1-name'].value = '';
            form.elements['subnet1-cidr'].value = '10.1.0.0/24';

//            form.elements['subnet1-route1-to'].value = '206.196.0.0/16';
//            form.elements['subnet1-route1-next'].value = 'internet';
//            form.elements['subnet1-route2-to'].value = '72.24.24.0/24';
//            form.elements['subnet1-route2-next'].value = 'vpn';
            form.elements['subnet1-route-default'].checked = true;

            form.elements['subnet1-vm1'].value = 'vm_OPS';
            form.elements['subnet1-vm1-instance'].value = '4';
            form.elements['subnet1-vm1-image'].value = '77817b73-baa2-424b-b890-e1a95af1fdf9';
            form.elements['subnet1-vm1-keypair'].value = 'icecube_key';
            form.elements['subnet1-vm1-security'].value = 'rains';
            form.elements['subnet1-vm1-host'].value = 'msx1';
            form.elements['subnet1-vm1-floating'].value = '206.196.180.148';
            form.elements['subnet1-vm1-sriov1-dest'].value = 'urn:ogf:network:domain=dragon.maxgigapop.net:node=CLPK:port=1-2-3:link=*';
            form.elements['subnet1-vm1-sriov1-mac'].value = 'aa:bb:cc:00:00:12';
            form.elements['subnet1-vm1-sriov1-ip'].value = '10.10.0.1/30';
            form.elements['subnet1-vm1-route1-to'].value = '192.168.0.0/24';
            form.elements['subnet1-vm1-route1-next'].value = '10.10.0.2';
            form.elements['subnet1-vm1-route2-to'].value = '206.196.179.0/24';
            form.elements['subnet1-vm1-route2-next'].value = '10.10.0.2';

//            form.elements['subnet2-name'].value = '';
//            form.elements['subnet2-cidr'].value = '10.1.1.0/24';

            break;
    }
}

function applyFL2PTemplate(code) {
    var form = document.getElementById('custom-form');
    form.reset();

    switch (code) {
        case 1:
            form.elements['topUri'].value = 'urn:ogf:network:domain=vo1.stackv.org:link=link1';
            form.elements['eth-src'].value = 'urn:ogf:network:onos.maxgigapop.net:network1:of:0000000000000005:port-s5-eth1';
            form.elements['eth-des'].value = 'urn:ogf:network:onos.maxgigapop.net:network1:of:0000000000000002:port-s2-eth1';

            break;
    }

}



function applyDNCTemplate(code) {
    var form = document.getElementById('custom-form');
    form.reset();

    switch (code) {
        case 1:
            //form.elements['topoUri'].value = 'urn:ogf:network:vo1.maxgigapop.net:link';
            form.elements['linkUri1'].value = 'urn:ogf:network:vo1.maxgigapop.net:link=conn1';
            form.elements['link1-src'].value = 'urn:ogf:network:domain=dragon.maxgigapop.net:node=CLPK:port=1-2-3:link=*';
            form.elements['link1-src-vlan'].value = '3021-3029';
            form.elements['link1-des'].value = 'urn:ogf:network:domain=dragon.maxgigapop.net:node=CLPK:port=1-1-2:link=*';
            form.elements['link1-des-vlan'].value = '3021-3029';

            break;
        case 2:
            if (linkCounter === 1) {
                addLink();
            }

            form.elements['linkUri1'].value = 'urn:ogf:network:vo1.maxgigapop.net:link=conn1';
            form.elements['link1-src'].value = 'urn:ogf:network:domain=dragon.maxgigapop.net:node=CLPK:port=1-2-3:link=*';
            form.elements['link1-src-vlan'].value = '3021-3029';
            form.elements['link1-des'].value = 'urn:ogf:network:domain=dragon.maxgigapop.net:node=CLPK:port=1-1-2:link=*';
            form.elements['link1-des-vlan'].value = '3021-3029';
            form.elements['linkUri2'].value = 'urn:ogf:network:vo1.maxgigapop.net:link=conn2';
            form.elements['link2-src'].value = 'urn:ogf:network:domain=dragon.maxgigapop.net:node=CLPK:port=1-2-3:link=*';
            form.elements['link2-src-vlan'].value = '3021-3029';
            form.elements['link2-des'].value = 'urn:ogf:network:domain=dragon.maxgigapop.net:node=CLPK:port=1-1-2:link=*';
            form.elements['link2-des-vlan'].value = '3021-3029';

            break;
        default:

    }
}

function dncModerate() {
    var superstate = document.getElementById("instance-superstate").innerHTML;
    var substate = document.getElementById("instance-substate").innerHTML;

    if (superstate === 'Create') {
        switch (substate) {
            case 'READY':
                $("#instance-cancel").toggleClass("hide");
                break;

            case 'INIT':
                $("#instance-delete").toggleClass("hide");
                break;

            case 'FAILED':
                $("#instance-delete").toggleClass("hide");
                break;
        }
    }
    if (superstate === 'Cancel') {
        switch (substate) {
            case 'READY':
                $("#instance-delete").toggleClass("hide");
                break;

            case 'FAILED':
                $("#instance-delete").toggleClass("hide");
                break;
        }
    }
}


function fl2pModerate(uuid) {
    var superstate = document.getElementById("instance-superstate").innerHTML;
    var substate = document.getElementById("instance-substate").innerHTML;

    if (superstate === 'Create') {
        switch (substate) {
            case 'READY':
                $("#instance-cancel").toggleClass("hide");
                break;

            case 'INIT':
                $("#instance-delete").toggleClass("hide");
                break;

            case 'FAILED':
                $("#instance-delete").toggleClass("hide");
                break;
        }
    }
    if (superstate === 'Cancel') {
        switch (substate) {
            case 'READY':
                $("#instance-delete").toggleClass("hide");
                break;

            case 'FAILED':
                $("#instance-delete").toggleClass("hide");
                break;
        }
    }
    if (superstate === 'Reinstate') {
        switch (substate) {
            case 'READY':
                $("#instance-reinstate").toggleClass("hide");
                break;
            case 'FAILED':
                $("#instance-delete").toggleClass("hide");
                break;

        }
    }
}


/* REFRESH */

function timerChange(sel) {
    clearInterval(refreshTimer);
    clearInterval(countdownTimer);
    if (sel.value !== 'off') {
        setRefresh(sel.value);
    } else {
        document.getElementById('refresh-button').innerHTML = 'Manually Refresh Now';
    }
}


function setRefreshTracker(time) {
    countdown = time;
    refreshTimer = setInterval(function () {
        reloadTracker(time);
    }, (time * 1000));
    countdownTimer = setInterval(function () {
        refreshCountdown(time);
    }, 1000);
}

function reloadTracker(time) {
    enableLoading();
    keycloak.updateToken(30).error(function () {
        console.log("Error updating token!");
    });

    var manual = false;
    if (typeof time === "undefined") {
        time = countdown;
    }
    if (document.getElementById('refresh-button').innerHTML === 'Manually Refresh Now') {
        manual = true;
    }

    $('#instance-panel').load(document.URL + ' #status-table', function () {
        loadInstances();

        $(".clickable-row").click(function () {
            window.document.location = $(this).data("href");
        });

        if (manual === false) {
            countdown = time;
            document.getElementById('refresh-button').innerHTML = 'Refresh in ' + countdown + ' seconds';
        } else {
            document.getElementById('refresh-button').innerHTML = 'Manually Refresh Now';
        }

        setTimeout(function () {
            disableLoading();
        }, 750);
    });
}

function setRefreshInstance(time) {
    countdown = time;
    refreshTimer = setInterval(function () {
        reloadInstance(time);
    }, (time * 1000));
    countdownTimer = setInterval(function () {
        refreshCountdown(time);
    }, 1000);
}

function reloadInstance(time) {
    keycloak.updateToken(30).error(function () {
        console.log("Error updating token!");
    });
    enableLoading();
    var uuid = getURLParameter("uuid");
    var manual = false;
    if (typeof time === "undefined") {
        time = countdown;
    }
    if (document.getElementById('refresh-button').innerHTML === 'Manually Refresh Now') {
        manual = true;
    }

    $('#details-panel').load(document.URL + ' #details-panel', function () {
        deltaModerate();
        instructionModerate();
        buttonModerate();
        loadACL(uuid);
        loadStatus(uuid);
        loadVisualization();

        $(".delta-table-header").click(function () {
            $("#body-" + this.id).toggleClass("hide");
        });

        if (manual === false) {
            countdown = time;
            document.getElementById('refresh-button').innerHTML = 'Refresh in ' + countdown + ' seconds';
        } else {
            document.getElementById('refresh-button').innerHTML = 'Manually RefreshNow ';
        }

        setTimeout(function () {
            disableLoading();
        }, 750);
    });
}

function refreshCountdown() {
    document.getElementById('refresh-button').innerHTML = 'Refresh in ' + countdown + ' seconds';
    countdown--;
}


/* CATALOG */

function catalogLoad() {
    loadInstances();
    loadWizard();
    loadEditor();

    setTimeout(function () {
        $("#instance-panel").removeClass("closed");
        $("#catalog-panel").removeClass("closed");
    }, 250);
}

function loadInstances() {
    var userId = keycloak.subject;
    var tbody = document.getElementById("status-body");
    $("#status-body").empty();

    var apiUrl = baseUrl + '/StackV-web/restapi/app/panel/' + userId + '/instances';
    $.ajax({
        url: apiUrl,
        type: 'GET',
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", "bearer " + keycloak.token);
        },
        success: function (result) {
            for (i = 0; i < result.length; i++) {
                var instance = result[i];

                var row = document.createElement("tr");
                row.className = "clickable-row";
                row.setAttribute("data-href", '/StackV-web/ops/details/templateDetails.jsp?uuid=' + instance[1]);

                var cell1_1 = document.createElement("td");
                cell1_1.innerHTML = instance[3];
                var cell1_2 = document.createElement("td");
                cell1_2.innerHTML = instance[0];
                var cell1_3 = document.createElement("td");
                cell1_3.innerHTML = instance[1];
                var cell1_4 = document.createElement("td");
                cell1_4.innerHTML = instance[2];
                row.appendChild(cell1_1);
                row.appendChild(cell1_2);
                row.appendChild(cell1_3);
                row.appendChild(cell1_4);
                tbody.appendChild(row);
            }

            $(".clickable-row").click(function () {
                window.document.location = $(this).data("href");
            });
        }
    });
}

function loadWizard() {
    var userId = keycloak.subject;
    var tbody = document.getElementById("wizard-body");
    $("#wizard-body").empty();

    var apiUrl = baseUrl + '/StackV-web/restapi/app/panel/' + userId + '/wizard';
    $.ajax({
        url: apiUrl,
        type: 'GET',
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", "bearer " + keycloak.token);
        },
        success: function (result) {
            for (i = 0; i < result.length; i++) {
                var profile = result[i];

                var row = document.createElement("tr");
                var cell1_1 = document.createElement("td");
                cell1_1.innerHTML = profile[0];
                var cell1_2 = document.createElement("td");
                cell1_2.innerHTML = profile[1];
                var cell1_3 = document.createElement("td");
                cell1_3.innerHTML = "<button class='button-profile-select' id='" + profile[2] + "'>Select</button><button class='button-profile-delete' id='" + profile[2] + "'>Delete</button>";
                row.appendChild(cell1_1);
                row.appendChild(cell1_2);
                row.appendChild(cell1_3);
                tbody.appendChild(row);
            }

            $(".button-profile-select").click(function (evt) {
                var apiUrl = baseUrl + '/StackV-web/restapi/app/profile/' + this.id;
                $.ajax({
                    url: apiUrl,
                    type: 'GET',
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader("Authorization", "bearer " + keycloak.token);
                    },
                    success: function (result) {
                        $("#black-screen").removeClass("off");
                        $("#info-panel").addClass("active");
                        $("#info-panel-title").html("Profile Details");
                        $("#info-panel-text-area").val(JSON.stringify(result));
                        prettyPrintInfo();
                    },
                    error: function (textStatus, errorThrown) {
                        console.log(textStatus);
                        console.log(errorThrown);
                    }
                });

                evt.preventDefault();
            });

            $(".button-profile-delete").click(function (evt) {
                var apiUrl = baseUrl + '/StackV-web/restapi/app/profile/' + this.id;
                $.ajax({
                    url: apiUrl,
                    type: 'DELETE',
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader("Authorization", "bearer " + keycloak.token);
                    },
                    success: function (result) {
                        wizardLoad();
                    },
                    error: function (textStatus, errorThrown) {
                        console.log(textStatus);
                        console.log(errorThrown);
                    }
                });

                evt.preventDefault();
            });

            $(".button-profile-submit").click(function (evt) {
                var apiUrl = baseUrl + '/StackV-web/restapi/app/service';
                $.ajax({
                    url: apiUrl,
                    type: 'POST',
                    data: $("#info-panel-text-area").val(),
                    contentType: "application/json; charset=utf-8",
                    dataType: "json",
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader("Authorization", "bearer " + keycloak.token);
                    },
                    success: function (result) {

                    },
                    error: function (textStatus, errorThrown) {
                        console.log(textStatus);
                        console.log(errorThrown);
                    }
                });
                $("#black-screen").addClass("off");
                $("#info-panel").removeClass("active");
                evt.preventDefault();
            });
        }
    });
}

function loadEditor() {
    var userId = keycloak.subject;
    var tbody = document.getElementById("editor-body");

    var apiUrl = baseUrl + '/StackV-web/restapi/app/panel/' + userId + '/editor';
    $.ajax({
        url: apiUrl,
        type: 'GET',
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", "bearer " + keycloak.token);
        },
        success: function (result) {
            for (i = 0; i < result.length; i++) {
                var profile = result[i];

                var row = document.createElement("tr");
                var cell1_1 = document.createElement("td");
                cell1_1.innerHTML = profile[0];
                var cell1_2 = document.createElement("td");
                cell1_2.innerHTML = profile[1];
                var cell1_3 = document.createElement("td");
                cell1_3.innerHTML = "<button class='button-service-select' id='" + profile[2] + "'>Select</button";
                row.appendChild(cell1_1);
                row.appendChild(cell1_2);
                row.appendChild(cell1_3);
                tbody.appendChild(row);
            }

            $(".button-service-select").click(function (evt) {
                var ref = "/StackV-web/ops/srvc/" + this.id.toLowerCase() + ".jsp";
                window.location.href = ref;

                evt.preventDefault();
            });
        }
    });
}


/* DETAILS */

function loadVisualization() {
    $("#details-viz").load("/StackV-web/details_viz.jsp", function () {
        // Loading Verification visualization
        $("#ver-add").append($("#va_viz_div"));
        $("#ver-add").find("#va_viz_div").removeClass("hidden");

        $("#unver-add").append($("#ua_viz_div"));
        $("#unver-add").find("#ua_viz_div").removeClass("hidden");

        $("#ver-red").append($("#vr_viz_div"));
        $("#ver-red").find("#vr_viz_div").removeClass("hidden");

        $("#unver-red").append($("#ur_viz_div"));
        $("#unver-red").find("#ur_viz_div").removeClass("hidden");

        // Loading Service Delta visualization
        $("#delta-Service").addClass("hide");
        $(".service-delta-table").removeClass("hide");

        $("#serv-add").append($("#serva_viz_div"));
        $("#serv-add").find("#serva_viz_div").removeClass("hidden");

        $("#serv-red").append($("#servr_viz_div"));
        $("#serv-red").find("#servr_viz_div").removeClass("hidden");

        // Loading System Delta visualization 
        var subState = document.getElementById("instance-substate").innerHTML;
        var verificationTime = document.getElementById("verification-time").innerHTML;
        if ((subState !== 'READY' && subState === 'FAILED') || verificationTime === '') {
            $("#delta-System").addClass("hide");
            $("#delta-System").insertAfter(".system-delta-table");

            $(".system-delta-table").removeClass("hide");

            // Toggle button should toggle  between system delta visualization and delta-System table
            // if the verification failed
            document.querySelector(".system-delta-table .details-model-toggle").onclick = function () {
                toggleTextModel('.system-delta-table', '#delta-System');
            };

            $("#sys-red").append($("#sysr_viz_div"));
            $("#sys-add").append($("#sysa_viz_div"));

            $("#sys-red").find("#sysr_viz_div").removeClass("hidden");
            $("#sys-add").find("#sysa_viz_div").removeClass("hidden");
        } else {
            // Toggle button should toggle between  verification visualization and delta-System table
            // if the verification succeeded
            $("#delta-System").insertAfter(".verification-table");
            document.querySelector("#delta-System .details-model-toggle").onclick = function () {
                toggleTextModel('.verification-table', '#delta-System');
            };
        }
    });
}

function toggleTextModel(viz_table, text_table) {
    if (!$(viz_table.toLowerCase()).length) {
        alert("Visualization not found");
    } else if (!$(text_table).length) {
        alert("Text model not found");
    } else {
        $(viz_table.toLowerCase()).toggleClass("hide");
        $(text_table).toggleClass("hide");
    }
}

// Moderation Functions

function deltaModerate() {
    var subState = document.getElementById("instance-substate").innerHTML;
    var verificationTime = document.getElementById("verification-time").innerHTML;
    var verificationAddition = document.getElementById("verification-addition").innerHTML;
    var verificationReduction = document.getElementById("verification-reduction").innerHTML;

    var verAdd = document.getElementById("ver-add").innerHTML;
    var unverAdd = document.getElementById("unver-add").innerHTML;
    var verRed = document.getElementById("ver-red").innerHTML;
    var unverRed = document.getElementById("unver-red").innerHTML;

    if ((subState === 'READY' || subState !== 'FAILED') && verificationTime !== '') {
        $("#delta-System").addClass("hide");
        $(".verification-table").removeClass("hide");

        if (verificationAddition === '' || (verAdd === '{ }' && unverAdd === '{ }')) {
            $("#verification-addition-row").addClass("hide");
        }
        if (verificationReduction === '' || (verRed === '{ }' && unverRed === '{ }')) {
            $("#verification-reduction-row").addClass("hide");
        }
    }
}

function instructionModerate() {
    var subState = document.getElementById("instance-substate").innerHTML;
    var verificationState = document.getElementById("instance-verification").innerHTML;
    var verificationRun = document.getElementById("verification-run").innerHTML;
    var blockString = "";

    // State -1 - Error during validation/reconstruction
    if ((subState === 'READY' || subState === 'FAILED') && verificationState === "") {
        blockString = "Service encountered an error during verification. Please contact your technical supervisor for further instructions.";
    }
    // State 0 - Before Verify
    else if (subState !== 'READY' && subState !== 'FAILED') {
        blockString = "Service is still processing. Please hold for further instructions.";
    }
    // State 1 - Ready & Verifying
    else if (subState === 'READY' && verificationState === '0') {
        blockString = "Service is verifying.";
    }
    // State 2 - Ready & Verified
    else if (subState === 'READY' && verificationState === '1') {
        blockString = "Service has been successfully verified.";
    }
    // State 3 - Ready & Unverified
    else if (subState === 'READY' && verificationState === '-1') {
        blockString = "Service was not able to be verified.";
    }
    // State 4 - Failed & Verifying
    else if (subState === 'FAILED' && verificationState === '0') {
        blockString = "Service is verifying. (Run " + verificationRun + "/5)";
    }
    // State 5 - Failed & Verified
    else if (subState === 'FAILED' && verificationState === '1') {
        blockString = "Service has been successfully verified.";
    }
    // State 6 - Failed & Unverified
    else if (subState === 'FAILED' && verificationState === '-1') {
        blockString = "Service was not able to be verified.";
    }

    document.getElementById("instruction-block").innerHTML = blockString;
}

function buttonModerate() {
    var superState = document.getElementById("instance-superstate").innerHTML;
    var subState = document.getElementById("instance-substate").innerHTML;
    var verificationState = document.getElementById("instance-verification").innerHTML;

    if (superState === 'Create') {
        // State 0 - Stuck 
        if (verificationState === "") {
            $("#instance-fdelete").toggleClass("hide");
            $("#instance-fcancel").toggleClass("hide");
            $("#instance-fretry").toggleClass("hide");
            $("#instance-reverify").toggleClass("hide");
        }
        // State 1 - Ready & Verifying
        if (subState === 'READY' && verificationState === '0') {

        }
        // State 2 - Ready & Verified
        else if (subState === 'READY' && verificationState === '1') {
            $("#instance-cancel").toggleClass("hide");
            $("#instance-modify").toggleClass("hide");
        }
        // State 3 - Ready & Unverified
        else if (subState === 'READY' && verificationState === '-1') {
            $("#instance-fcancel").toggleClass("hide");
            $("#instance-reverify").toggleClass("hide");
        }
        // State 4 - Failed & Verifying
        else if (subState === 'FAILED' && verificationState === '0') {

        }
        // State 5 - Failed & Verified
        else if (subState === 'FAILED' && verificationState === '1') {
            $("#instance-fcancel").toggleClass("hide");
            $("#instance-fmodify").toggleClass("hide");
        }
        // State 6 - Failed & Unverified
        else if (subState === 'FAILED' && verificationState === '-1') {
            $("#instance-fcancel").toggleClass("hide");
            $("#instance-fretry").toggleClass("hide");
            $("#instance-reverify").toggleClass("hide");
        }
    } else if (superState === 'Cancel') {
        // State 0 - Stuck 
        if (verificationState === "") {
            $("#instance-fdelete").toggleClass("hide");
            $("#instance-fretry").toggleClass("hide");
            $("#instance-reverify").toggleClass("hide");
        }
        // State 1 - Ready & Verifying
        if (subState === 'READY' && verificationState === '0') {

        }
        // State 2 - Ready & Verified
        else if (subState === 'READY' && verificationState === '1') {
            $("#instance-reinstate").toggleClass("hide");
            $("#instance-modify").toggleClass("hide");
            $("#instance-delete").toggleClass("hide");
        }
        // State 3 - Ready & Unverified
        else if (subState === 'READY' && verificationState === '-1') {
            $("#instance-fdelete").toggleClass("hide");
            $("#instance-freinstate").toggleClass("hide");
            $("#instance-reverify").toggleClass("hide");
        }
        // State 4 - Failed & Verifying
        else if (subState === 'FAILED' && verificationState === '0') {

        }
        // State 5 - Failed & Verified
        else if (subState === 'FAILED' && verificationState === '1') {
            $("#instance-freinstate").toggleClass("hide");
            $("#instance-fmodify").toggleClass("hide");
            $("#instance-delete").toggleClass("hide");
        }
        // State 6 - Failed & Unverified
        else if (subState === 'FAILED' && verificationState === '-1') {
            $("#instance-fdelete").toggleClass("hide");
            $("#instance-freinstate").toggleClass("hide");
            $("#instance-fretry").toggleClass("hide");
            $("#instance-reverify").toggleClass("hide");
        }
    } else if (superState === 'Reinstate') {
        // State 0 - Stuck 
        if (verificationState === "") {
            $("#instance-fdelete").toggleClass("hide");
            $("#instance-fretry").toggleClass("hide");
            $("#instance-reverify").toggleClass("hide");
        }
        // State 1 - Ready & Verifying
        if (subState === 'READY' && verificationState === '0') {

        }
        // State 2 - Ready & Verified
        else if (subState === 'READY' && verificationState === '1') {
            $("#instance-cancel").toggleClass("hide");
            $("#instance-modify").toggleClass("hide");
        }
        // State 3 - Ready & Unverified
        else if (subState === 'READY' && verificationState === '-1') {
            $("#instance-fcancel").toggleClass("hide");
            $("#instance-reverify").toggleClass("hide");
        }
        // State 4 - Failed & Verifying
        else if (subState === 'FAILED' && verificationState === '0') {

        }
        // State 5 - Failed & Verified
        else if (subState === 'FAILED' && verificationState === '1') {
            $("#instance-fcancel").toggleClass("hide");
            $("#instance-fmodify").toggleClass("hide");
        }
        // State 6 - Failed & Unverified
        else if (subState === 'FAILED' && verificationState === '-1') {
            $("#instance-fcancel").toggleClass("hide");
            $("#instance-fretry").toggleClass("hide");
            $("#instance-reverify").toggleClass("hide");
        }
    }
}

function loadACL() {
    var select = document.getElementById("acl-select");
    $("#acl-select").empty();

    var apiUrl = baseUrl + '/StackV-web/restapi/app/panel/' + keycloak.subject + '/acl';
    $.ajax({
        url: apiUrl,
        type: 'GET',
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", "bearer " + keycloak.token);
        },
        success: function (result) {
            for (i = 0; i < result.length; i++) {
                select.append("<option>" + result[i] + "</option>");
            }
        }
    });
}

function loadStatus(refUuid) {
    var ele = document.getElementById("instance-substate");
    var apiUrl = baseUrl + '/StackV-web/restapi/app/service/' + refUuid + '/substatus';
    $.ajax({
        url: apiUrl,
        type: 'GET',
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", "bearer " + keycloak.token);
        },
        success: function (result) {
            ele.innerHTML = result;
        }
    });
}


/* UTILITY */

function getURLParameter(name) {
    return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [null, ''])[1].replace(/\+/g, '%20')) || null;
}

// Helper method to parse the title tag from the response.
function getTitle(text) {
    return text.match('<title>(.*)?</title>')[1];
}

function clearCounters() {
    volumeCounter = 0;
    fieldCounter = 0;
    queryCounter = 1;
    routeCounter = 1;
    subnetCounter = 1;
    SRIOVCounter = 1;
    SRIOVRouteCounter = 1;
    VMCounter = 1;
    gatewayCounter = 1;
    subRouteCounter = 1;
    linkCounter = 1;
}

function reloadPage() {
    window.location.reload(true);
}

function reloadPanel(panelId) {
    $('#' + panelId).load(document.URL + ' #' + panelId);
}

function emptyElement(id) {
    $("#" + id).empty();
}

// Create the XHR object.
function createCORSRequest(method, url) {
    var xhr = new XMLHttpRequest();
    if ("withCredentials" in xhr) {
        // XHR for Chrome/Firefox/Opera/Safari.
        xhr.open(method, url, true);
    } else if (typeof XDomainRequest !== "undefined") {
        // XDomainRequest for IE.
        xhr = new XDomainRequest();
        xhr.open(method, url);
    } else {
        // CORS not supported.
        xhr = null;
    }
    return xhr;
}

function enableLoading() {
    $("#main-pane").addClass("loading");
}

function disableLoading() {
    $("#main-pane").removeClass("loading");
}