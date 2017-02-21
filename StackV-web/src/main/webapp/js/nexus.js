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
                sessionStorage.setItem("username", keycloak.tokenParsed.preferred_username);
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
            setTimeout(loadCatalog, 500);
            setRefresh(60);
        }
        // templateDetails
        else if (window.location.pathname === "/StackV-web/ops/details/templateDetails.jsp") {
            loadDetails();
            setRefresh(60);
        } else if (window.location.pathname === "/StackV-web/ops/acl.jsp") {
            loadACLPortal();
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
        // set the active link - get everything after StackV-web
        var url = $(location).attr('href').split(/\/StackV-web\//)[1];
        if (/driver.jsp/.test(url))
            $("li#driver-tab").addClass("active");
        else if (/catalog.jsp/.test(url))
            $("li#catalog-tab").addClass("active");
        else if (/graphTest.jsp/.test(url))
            $("li#visualization-tab").addClass("active");
        else if (/acl.jsp/.test(url))
            $("li#acl-tab").addClass("active");

        $("#logout-button").click(function (evt) {
            keycloak.logout();

            evt.preventDefault();
        });
        $("#account-button").click(function (evt) {
            keycloak.accountManagement();

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
        sessionStorage.setItem("uuid", $(this).data("href"));
        window.document.location = "/StackV-web/ops/details/templateDetails.jsp";
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
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", "bearer " + keycloak.token);
            xhr.setRequestHeader("Refresh", keycloak.refreshToken);
        },
        success: function (result) {
            var statusElement = document.getElementById("instance-status");
            statusElement.innerHTML = result;
        }
    });
}

function cancelInstance(uuid) {
    var apiUrl = baseUrl + '/StackV-web/restapi/app/service/' + uuid + '/cancel';
    $.ajax({
        url: apiUrl,
        type: 'PUT',
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", "bearer " + keycloak.token);
        },
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
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", "bearer " + keycloak.token);
        },
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
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", "bearer " + keycloak.token);
        },
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
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", "bearer " + keycloak.token);
        },
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
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", "bearer " + keycloak.token);
        },
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
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", "bearer " + keycloak.token);
        },
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
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", "bearer " + keycloak.token);
        },
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
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", "bearer " + keycloak.token);
            xhr.setRequestHeader("Refresh", keycloak.refreshToken);
        },
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
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", "bearer " + keycloak.token);
        },
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

function setRefresh(time) {
    countdown = time;
    refreshTimer = setInterval(function () {
        if (window.location.pathname === "/StackV-web/ops/catalog.jsp") {
            reloadCatalog(time);
        } else if (window.location.pathname === "/StackV-web/ops/details/templateDetails.jsp") {
            reloadDetails(time);
        }
    }, (time * 1000));
    countdownTimer = setInterval(function () {
        refreshCountdown(time);
    }, 1000);
}

function refreshCountdown() {
    document.getElementById('refresh-button').innerHTML = 'Refresh in ' + countdown + ' seconds';
    countdown--;
}

function reloadCatalog(time) {
    enableLoading();
    keycloak.updateToken(90).error(function () {
        console.log("Error updating token!");
    }).success(function (refreshed) {
        if (refreshed) {
            sessionStorage.setItem("token", keycloak.token);
            console.log("Token Refreshed by nexus!");
        }

        var timerSetting = $("#refresh-timer").val();
        var manual = false;
        if (typeof time === "undefined") {
            time = countdown;
        }
        if (document.getElementById('refresh-button').innerHTML === 'Manually Refresh Now') {
            manual = true;
        }

        $('#instance-panel').load(document.URL + ' #status-table', function () {
            loadInstances();

            $("#refresh-timer").val(timerSetting);
            if (manual === false) {
                countdown = time;
                document.getElementById('refresh-button').innerHTML = 'Refresh in ' + countdown + ' seconds';
            } else {
                document.getElementById('refresh-button').innerHTML = 'Manually Refresh Now';
            }

            $(".clickable-row").click(function () {
                sessionStorage.setItem("uuid", $(this).data("href"));
                window.document.location = "/StackV-web/ops/details/templateDetails.jsp";
            });

            setTimeout(function () {
                disableLoading();
            }, 750);
        });

    });
}

function reloadDetails(time) {
    enableLoading();
    keycloak.updateToken(90).error(function () {
        console.log("Error updating token!");
    }).success(function (refreshed) {
        if (refreshed) {
            sessionStorage.setItem("token", keycloak.token);
            console.log("Token Refreshed by nexus!");
        }

        var timerSetting = $("#refresh-timer").val();
        var uuid = getURLParameter("uuid");
        var manual = false;
        if (typeof time === "undefined") {
            time = countdown;
        }
        if (document.getElementById('refresh-button').innerHTML === 'Manually Refresh Now') {
            manual = true;
        }

        $('#details-panel').load(document.URL + ' #details-table', function () {
            loadDetails();

            setTimeout(function () {
                $("#refresh-timer").val(timerSetting);
                if (manual === false) {
                    countdown = time;
                    $("#refresh-button").html('Refresh in ' + countdown + ' seconds');
                } else {
                    $("#refresh-button").html('Manually Refresh Now');
                }

                $(".delta-table-header").click(function () {
                    $("#body-" + this.id).toggleClass("hide");
                });

                disableLoading();
            }, 750);
        });
    });
}


/* CATALOG */

function loadCatalog() {
    loadInstances();
    loadWizard();
    loadEditor();

    setTimeout(function () {
        $("#instance-panel").removeClass("closed");
        $("#catalog-panel").removeClass("closed");
    }, 500);
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
                row.setAttribute("data-href", instance[1]);

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
                sessionStorage.setItem("uuid", $(this).data("href"));
                window.document.location = "/StackV-web/ops/details/templateDetails.jsp";
            });
        }
    });
}

function loadWizard() {
    var userId = keycloak.subject;
    var tbody = document.getElementById("wizard-body");
    // wipe table
    $("tbody#wizard-body").find("tr").remove();

    var apiUrl = baseUrl + '/StackV-web/restapi/app/panel/' + userId + '/wizard';
    $.ajax({
        url: apiUrl,
        type: 'GET',
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", "bearer " + keycloak.token);
        },
        success: function (result) {
            // unbind all click functions!
            $("button").off("click");
            for (i = 0; i < result.length; i++) {
                var profile = result[i];

                var row = document.createElement("tr");
                var cell1_1 = document.createElement("td");
                cell1_1.innerHTML = profile[0];
                var cell1_2 = document.createElement("td");
                cell1_2.innerHTML = profile[1];
                var cell1_3 = document.createElement("td");
                cell1_3.innerHTML = "<button class='button-profile-select btn btn-default' id='" + profile[2] + "'>Select</button><button class='button-profile-delete btn btn' id='" + profile[2] + "'>Delete</button>";
                row.appendChild(cell1_1);
                row.appendChild(cell1_2);
                row.appendChild(cell1_3);
                tbody.appendChild(row);
            }

            $(".button-profile-select").on("click", function (evt) {
                var resultID = this.id,
                        apiUrl = baseUrl + '/StackV-web/restapi/app/profile/' + resultID;

                $.ajax({
                    url: apiUrl,
                    type: 'GET',
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader("Authorization", "bearer " + keycloak.token);
                    },
                    success: function (result) {
                        $("#black-screen").removeClass("off");
                        $("#profile-modal").modal("show");
                        $("#info-panel-title").html("Profile Details");
                        $("#info-panel-text-area").val(JSON.stringify(result));
                        $(".button-profile-save").attr('id', resultID);
                        $(".button-profile-save-as").attr('id', resultID);
                        $(".button-profile-submit").attr('id', resultID);
                        prettyPrintInfo();
                    },
                    error: function (textStatus, errorThrown) {
                        console.log(textStatus);
                        console.log(errorThrown);
                    }
                });

                evt.preventDefault();
            });

            $(".button-profile-delete").on("click", function (evt) {
                var apiUrl = baseUrl + '/StackV-web/restapi/app/profile/' + this.id;
                $.ajax({
                    url: apiUrl,
                    type: 'DELETE',
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader("Authorization", "bearer " + keycloak.token);
                    },
                    success: function (result) {
                        loadWizard();
                    },
                    error: function (textStatus, errorThrown) {
                        console.log(textStatus);
                        console.log(errorThrown);
                    }
                });

                evt.preventDefault();
            });

            $(".button-profile-submit").on("click", function (evt) {
                var apiUrl = baseUrl + '/StackV-web/restapi/app/service';
                $.ajax({
                    url: apiUrl,
                    type: 'POST',
                    data: $("#info-panel-text-area").val(),
                    contentType: "application/json; charset=utf-8",
                    dataType: "json",
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader("Authorization", "bearer " + keycloak.token);
                        xhr.setRequestHeader("Refresh", keycloak.refreshToken);
                    },
                    success: function (result) {
                    },
                    error: function (textStatus, errorThrown) {
                        console.log(textStatus);
                        console.log(errorThrown);
                    }
                });
                // reload top table and hide modal
                reloadCatalog();
                $("div#profile-modal").modal("hide");
                $("#black-screen").addClass("off");
                $("#info-panel").removeClass("active");
                evt.preventDefault();
            });

            // Hide the regular buttons and reveal the save as box
            $("button.button-profile-save-as").on("click", function (evt) {
                $("div.info-panel-regular-buttons").css("display", "none");
                $("div.info-panel-save-as-description").css("display", "block");
            });

            // Reveal the regular buttons and hide the save as boxes
            $("button.button-profile-save-as-cancel").on("click", function (evt) {
                $("div.info-panel-save-as-description").css("display", "none");
                $("div.info-panel-regular-buttons").css("display", "block");
            });


            // After the user has put a new name and description for the new profile
            $(".button-profile-save-as-confirm").on("click", function (evt) {
                var apiUrl = baseUrl + '/StackV-web/restapi/app/profile/new';
                var data = {
                    name: $("#new-profile-name").val(),
                    userID: keycloak.subject,
                    description: $("#new-profile-description").val(),
                    data: $("#info-panel-text-area").val()
                };

                $.ajax({
                    url: apiUrl,
                    type: 'PUT',
                    data: JSON.stringify(data), //stringify to get escaped JSON in backend
                    contentType: "application/json; charset=utf-8",
                    dataType: "json",
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader("Authorization", "bearer " + keycloak.token);
                        xhr.setRequestHeader("Refresh", keycloak.refreshToken);
                    },
                    success: function (result) {
                        // revert to regular buttons and close modal
                        $("input#new-profile-name").val("");
                        $("input#new-profile-description").val("");
                        $("div.info-panel-save-as-description").css("display", "none");
                        $("div.info-panel-regular-buttons").css("display", "block");
                        $("div#profile-modal").modal("hide");
                        // reload table
                        loadWizard();
                    },
                    error: function (textStatus, errorThrown) {
                        console.log(textStatus);
                        console.log(errorThrown);
                    }
                });

                // reload the bottom panel
                $("#black-screen").addClass("off");
                $("#info-panel").removeClass("active");
                evt.preventDefault();
            });

            $(".button-profile-save").on("click", function (evt) {
                var apiUrl = baseUrl + '/StackV-web/restapi/app/profile/' + this.id + '/edit';

                $.ajax({
                    url: apiUrl,
                    type: 'PUT',
                    data: $("#info-panel-text-area").val(),
                    contentType: "application/json; charset=utf-8",
                    dataType: "json",
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader("Authorization", "bearer " + keycloak.token);
                        xhr.setRequestHeader("Refresh", keycloak.refreshToken);
                    },
                    success: function (result) {
                        // reload the bottom panel
                        loadWizard();
                        $("#profile-modal").modal("hide");
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
                cell1_3.innerHTML = "<button class='button-service-select btn btn-default' id='" + profile[2] + "'>Select</button";
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

function loadDetails() {
    var uuid = sessionStorage.getItem("uuid");

    // Subfunctions
    subloadInstance();
    subloadDelta();
    subloadVerification();
    subloadACL();

    // Moderation
    setTimeout(function () {
        loadStatus(uuid);
        loadACL(uuid);

        loadVisualization();
    }, 400);
}

function subloadInstance() {
    var uuid = sessionStorage.getItem("uuid");
    var apiUrl = baseUrl + '/StackV-web/restapi/app/details/' + uuid + '/instance';
    $.ajax({
        url: apiUrl,
        type: 'GET',
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", "bearer " + keycloak.token);
        },
        success: function (instance) {
            /*  instance mapping:
             *      0 - verification_state
             *      1 - name
             *      2 - alias_name
             *      3 - creation_time
             *      4 - super_state     */

            $("#details-panel").append("<div id='instance-verification' class='hide'>" + instance[0] + "</div>");
            var panel = document.getElementById("details-panel");

            var table = document.createElement("table");

            table.id = "details-table";
            table.className = "management-table";

            var thead = document.createElement("thead");
            var row = document.createElement("tr");
            var head = document.createElement("th");
            head.innerHTML = instance[1] + " Service Details";
            row.appendChild(head);
            head = document.createElement("th");
            head.innerHTML = '<div id="refresh-panel" class="form-inline">'
                    + '<label for="refresh-timer">Auto-Refresh Interval</label>'
                    + '<select id="refresh-timer" onchange="timerChange(this)" class="form-control">'
                    + '<option value="off">Off</option>'
                    + '<option value="5">5 sec.</option>'
                    + '<option value="10">10 sec.</option>'
                    + '<option value="30">30 sec.</option>'
                    + '<option value="60" selected>60 sec.</option>'
                    + '</select>'
                    + '</div>'
                    + '<button class="button-header btn btn-sm" id="refresh-button" onclick="reloadDetails()">Refresh in    seconds</button>';
            row.appendChild(head);
            thead.appendChild(row);
            table.appendChild(thead);

            var tbody = document.createElement("tbody");
            var row = document.createElement("tr");
            var cell = document.createElement("td");
            cell.innerHTML = "Instance Alias";
            row.appendChild(cell);
            cell = document.createElement("td");
            cell.innerHTML = instance[2];
            row.appendChild(cell);
            tbody.appendChild(row);

            row = document.createElement("tr");
            cell = document.createElement("td");
            cell.innerHTML = "Reference UUID";
            row.appendChild(cell);
            cell = document.createElement("td");
            cell.innerHTML = uuid;
            row.appendChild(cell);
            tbody.appendChild(row);

            row = document.createElement("tr");
            cell = document.createElement("td");
            cell.innerHTML = "Creation Time";
            row.appendChild(cell);
            cell = document.createElement("td");
            cell.id = "instance-creation-time";
            cell.innerHTML = instance[3];
            row.appendChild(cell);
            tbody.appendChild(row);

            row = document.createElement("tr");
            cell = document.createElement("td");
            cell.innerHTML = "Instance State";
            row.appendChild(cell);
            cell = document.createElement("td");
            cell.id = "instance-superstate";
            cell.innerHTML = instance[4];
            row.appendChild(cell);
            tbody.appendChild(row);

            row = document.createElement("tr");
            cell = document.createElement("td");
            cell.innerHTML = "Operation Status";
            row.appendChild(cell);
            cell = document.createElement("td");
            cell.id = "instance-substate";
            row.appendChild(cell);
            tbody.appendChild(row);

            row = document.createElement("tr");
            row.className = "instruction-row";
            cell = document.createElement("td");
            cell.innerHTML = '<div id="instruction-block"></div>';
            cell.colSpan = "2";
            row.appendChild(cell);
            tbody.appendChild(row);

            row = document.createElement("tr");
            row.className = "button-row";
            cell = document.createElement("td");
            cell.innerHTML = '<div class="service-instance-panel">'
                    + '<button class="btn btn-default hide instance-command" id="reinstate">Reinstate</button>'
                    + '<button class="btn btn-default hide instance-command" id="force_reinstate">Force Reinstate</button>'
                    + '<button class="btn btn-default hide instance-command" id="cancel">Cancel</button>'
                    + '<button class="btn btn-default hide instance-command" id="force_cancel">Force Cancel</button>'
                    + '<button class="btn btn-default hide instance-command" id="force_retry">Force Retry</button>'
                    + '<button class="btn btn-default hide instance-command" id="modify">Modify</button>'
                    + '<button class="btn btn-default hide instance-command" id="force_modify">Force Modify</button>'
                    + '<button class="btn btn-default hide instance-command" id="reverify">Re-Verify</button>'
                    + '<button class="btn btn-default hide instance-command" id="delete">Delete</button>'
                    + '<button class="btn btn-default hide instance-command" id="force_delete">Force Delete</button>'
                    + '</div>';
            cell.colSpan = "2";
            row.appendChild(cell);
            tbody.appendChild(row);

            table.appendChild(tbody);
            panel.insertBefore(table, panel.firstChild);

            $(".delta-table-header").click(function () {
                $("#body-" + this.id).toggleClass("hide");
            });

            $(".instance-command").click(function () {
                var command = this.id;
                var apiUrl = baseUrl + '/StackV-web/restapi/app/service/' + uuid + '/' + command;
                $.ajax({
                    url: apiUrl,
                    type: 'PUT',
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader("Authorization", "bearer " + keycloak.token);
                        xhr.setRequestHeader("Refresh", keycloak.refreshToken);
                    },
                    success: function () {
                        if (command === "delete" || command === "force_delete") {
                            enableLoading();
                            setTimeout(function () {
                                window.document.location = "/StackV-web/ops/catalog.jsp";
                            }, 250);
                        } else {
                            reloadDetails();
                        }
                    }
                });
            });
        }
    });
}

function subloadDelta() {
    var uuid = sessionStorage.getItem("uuid");
    var apiUrl = baseUrl + '/StackV-web/restapi/app/details/' + uuid + '/delta';
    $.ajax({
        url: apiUrl,
        type: 'GET',
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", "bearer " + keycloak.token);
        },
        success: function (result) {
            for (i = 0; i < result.length; i++) {
                /*  delta mapping:
                 *      0 - type
                 *      1 - service_delta_id
                 *      2 - super_state
                 *      3 - delta   */
                var delta = result[i];

                var table = document.createElement("table");
                table.className = "management-table delta-table";
                table.id = "delta-" + delta[0];

                var thead = document.createElement("thead");
                thead.className = "delta-table-header";
                thead.id = "delta-" + delta[1];
                var row = document.createElement("tr");
                var head = document.createElement("th");
                head.innerHTML = "Delta Details";
                row.appendChild(head);
                head = document.createElement("th");
                row.appendChild(head);
                thead.appendChild(row);
                table.appendChild(thead);

                var tbody = document.createElement("tbody");
                tbody.className = "delta-table-body";
                tbody.id = "body-delta-" + delta[1];

                row = document.createElement("tr");
                var cell = document.createElement("td");
                cell.innerHTML = "Delta State";
                row.appendChild(cell);
                cell = document.createElement("td");
                cell.innerHTML = delta[2];
                row.appendChild(cell);
                tbody.appendChild(row);

                row = document.createElement("tr");
                cell = document.createElement("td");
                cell.innerHTML = "Delta Type";
                row.appendChild(cell);
                cell = document.createElement("td");
                cell.innerHTML = delta[0];
                row.appendChild(cell);
                tbody.appendChild(row);

                row = document.createElement("tr");
                cell = document.createElement("td");
                row.appendChild(cell);
                cell = document.createElement("td");
                cell.id = '';
                cell.innerHTML = delta[3];
                row.appendChild(cell);
                tbody.appendChild(row);

                row = document.createElement("tr");
                cell = document.createElement("td");
                cell.colSpan = "2";
                cell.innerHTML = '<button  class="details-model-toggle btn btn-default" onclick="toggleTextModel(\'.'
                        + delta[0] + '-delta-table\', \'#delta-' + delta[0] + '\');">Toggle Text Model</button>';
                row.appendChild(cell);
                tbody.appendChild(row);

                table.appendChild(tbody);
                document.getElementById("details-panel").appendChild(table);

                $(".delta-table-header").click(function () {
                    $("#body-" + this.id).toggleClass("hide");
                });
            }
        }
    });
}

function subloadVerification() {
    var uuid = sessionStorage.getItem("uuid");
    var apiUrl = baseUrl + '/StackV-web/restapi/app/details/' + uuid + '/verification';
    $.ajax({
        url: apiUrl,
        type: 'GET',
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", "bearer " + keycloak.token);
        },
        success: function (verification) {
            /*  verification mapping:
             *      0 - verification_run
             *      1 - creation_time
             *      2 - addition
             *      3 - reduction
             *      4 - service_instance_id */
            var panel = document.getElementById("details-panel");

            var div = document.createElement("div");
            div.className = "hide";
            div.id = "verification-run";
            div.innerHTML = verification[0];
            panel.appendChild(div);
            div = document.createElement("div");
            div.className = "hide";
            div.id = "verification-time";
            div.innerHTML = verification[1];
            panel.appendChild(div);
            div = document.createElement("div");
            div.className = "hide";
            div.id = "verification-addition";
            div.innerHTML = verification[2];
            panel.appendChild(div);
            div = document.createElement("div");
            div.className = "hide";
            div.id = "verification-reduction";
            div.innerHTML = verification[3];
            panel.appendChild(div);

            var table = document.createElement("table");
            table.className = "management-table hide verification-table";


            var thead = document.createElement("thead");
            thead.className = "delta-table-header";
            thead.id = "delta-" + verification[4];
            var row = document.createElement("tr");
            var head = document.createElement("th");
            row.appendChild(head);
            head = document.createElement("th");
            head.innerHTML = "Verified";
            row.appendChild(head);
            head = document.createElement("th");
            head.innerHTML = "Unverified";
            row.appendChild(head);

            thead.appendChild(row);
            table.appendChild(thead);

            var tbody = document.createElement("tbody");
            tbody.className = "delta-table-body";
            tbody.id = "body-delta-" + verification[4];

            row = document.createElement("tr");
            row.id = "verification-addition-row";
            var cell = document.createElement("td");
            cell.innerHTML = "Addition";
            row.appendChild(cell);
            cell = document.createElement("td");
            cell.id = "ver-add";
            row.appendChild(cell);
            cell = document.createElement("td");
            cell.id = "unver-add";
            row.appendChild(cell);
            tbody.appendChild(row);

            row = document.createElement("tr");
            row.id = "verification-reduction-row";
            cell = document.createElement("td");
            cell.innerHTML = "Reduction";
            row.appendChild(cell);
            cell = document.createElement("td");
            cell.id = "ver-red";
            row.appendChild(cell);
            cell = document.createElement("td");
            cell.id = "unver-red";
            row.appendChild(cell);
            tbody.appendChild(row);

            row = document.createElement("tr");
            cell = document.createElement("td");
            cell.colSpan = "3";
            cell.innerHTML = '<button class="details-model-toggle btn btn-default" onclick="toggleTextModel(\'.verification-table', '#delta-System\');">Toggle Text Model</button>';
            row.appendChild(cell);
            tbody.appendChild(row);

            table.appendChild(tbody);
            panel.appendChild(table);

            $(".delta-table-header").click(function () {
                $("#body-" + this.id).toggleClass("hide");
            });
        }
    });
}

function subloadACL() {
    var uuid = sessionStorage.getItem("uuid");
    var apiUrl = baseUrl + '/StackV-web/restapi/app/details/' + uuid + '/acl';
    $.ajax({
        url: apiUrl,
        type: 'GET',
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", "bearer " + keycloak.token);
        },
        success: function (verification) {
            /*  acl mapping:
             */
            var panel = document.getElementById("details-panel");

            var table = document.createElement("table");
            table.className = "management-table hide acl-table";

            var thead = document.createElement("thead");
            thead.className = "delta-table-header";
            var row = document.createElement("tr");
            var head = document.createElement("th");
            row.appendChild(head);
            head = document.createElement("th");
            head.innerHTML = "Access Control";
            row.appendChild(head);

            thead.appendChild(row);
            table.appendChild(thead);

            var tbody = document.createElement("tbody");
            tbody.className = "delta-table-body";
            tbody.id = "acl-body";

            row = document.createElement("tr");
            var cell = document.createElement("td");
            cell.innerHTML = '<select id="acl-select" size="5" name="acl-select" multiple></select>';
            row.appendChild(cell);
            tbody.appendChild(row);

            row = document.createElement("tr");
            cell = document.createElement("td");
            cell.innerHTML = '<label>Give user access: <input type="text" name="acl-input" /></label>';
            row.appendChild(cell);
            tbody.appendChild(row);

            table.appendChild(tbody);
            panel.appendChild(table);

            $(".delta-table-header").click(function () {
                $("#body-" + this.id).toggleClass("hide");
            });
        }
    });
}

function buildDeltaTable(type) {
    var panel = document.getElementById("details-panel");

    var table = document.createElement("table");
    table.className = "management-table hide " + type.toLowerCase() + "-delta-table";

    var thead = document.createElement("thead");
    thead.className = "delta-table-header";
    var row = document.createElement("tr");
    var head = document.createElement("th");
    head.innerHTML = type + " Delta";
    row.appendChild(head);

    head = document.createElement("th");
    head.innerHTML = "Verified";
    row.appendChild(head);

    head = document.createElement("th");
    head.innerHTML = "Unverified";
    row.appendChild(head);

    row.appendChild(head);

    thead.appendChild(row);
    table.appendChild(thead);

    var tbody = document.createElement("tbody");
    tbody.className = "delta-table-body";
    //tbody.id = "acl-body";

    row = document.createElement("tr");
    var prefix = type.substring(0, 4).toLowerCase();
    var add = document.createElement("td");
    row.appendChild(add);

    add = document.createElement("td");
    add.id = prefix + "-add";
    row.appendChild(add);

    var red = document.createElement("td");
    red.id = prefix + "-red";
    row.appendChild(red);

    tbody.appendChild(row);
    row = document.createElement("tr");
    var cell = document.createElement("td");
    cell.colSpan = "3";
    cell.innerHTML = '<button  class="details-model-toggle btn btn-default" onclick="toggleTextModel(\'.' + type.toLowerCase() + '-delta-table\', \'#delta-' + type + '\');">Toggle Text Model</button>';
    row.appendChild(cell);
    tbody.appendChild(row);

    table.appendChild(tbody);
    var verification = document.getElementsByClassName("verification-table");
    if (verification) {
        panel.insertBefore(table, verification[0]);
    } else {
        panel.appendChild(table);
    }
}

function loadVisualization() {
    $("#details-viz").load("/StackV-web/details_viz.html", function () {
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
        buildDeltaTable("Service");
        buildDeltaTable("System");

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

            $("#syst-red").append($("#sysr_viz_div"));
            $("#syst-add").append($("#sysa_viz_div"));

            $("#syst-red").find("#sysr_viz_div").removeClass("hidden");
            $("#syst-add").find("#sysa_viz_div").removeClass("hidden");
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
        // delta-Service, service verification etc must always display before
        // everything else.
        if (text_table.toLowerCase().indexOf("service") > 0) {
            $(text_table).insertAfter("#details-table")
        }
        $(text_table).toggleClass("hide");

    }
}

// Moderation Functions

function deltaModerate() {
    if (document.getElementById("verification-time") !== null) {
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
}

function instructionModerate() {
    if (document.getElementById("verification-run") !== null) {
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
}

function buttonModerate() {
    var superState = document.getElementById("instance-superstate").innerHTML;
    var subState = document.getElementById("instance-substate").innerHTML;
    var verificationState = document.getElementById("instance-verification").innerHTML;

    if (superState === 'Create') {
        // State 0 - Stuck
        if (verificationState === "" || verificationState === "null" || subState === "INIT") {
            $("#force_delete").toggleClass("hide");
            $("#force_cancel").toggleClass("hide");
            $("#force_retry").toggleClass("hide");
            $("#reverify").toggleClass("hide");
        }
        // State 1 - Ready & Verifying
        if (subState === 'READY' && verificationState === '0') {

        }
        // State 2 - Ready & Verified
        else if (subState === 'READY' && verificationState === '1') {
            $("#cancel").toggleClass("hide");
            $("#modify").toggleClass("hide");
        }
        // State 3 - Ready & Unverified
        else if (subState === 'READY' && verificationState === '-1') {
            $("#force_cancel").toggleClass("hide");
            $("#reverify").toggleClass("hide");
        }
        // State 4 - Failed & Verifying
        else if (subState === 'FAILED' && verificationState === '0') {

        }
        // State 5 - Failed & Verified
        else if (subState === 'FAILED' && verificationState === '1') {
            $("#force_cancel").toggleClass("hide");
            $("#force_modify").toggleClass("hide");
        }
        // State 6 - Failed & Unverified
        else if (subState === 'FAILED' && verificationState === '-1') {
            $("#force_cancel").toggleClass("hide");
            $("#force_retry").toggleClass("hide");
            $("#reverify").toggleClass("hide");
        }
    } else if (superState === 'Cancel') {
        // State 0 - Stuck
        if (verificationState === "" || verificationState === "null" || subState === "INIT") {
            $("#force_delete").toggleClass("hide");
            $("#force_retry").toggleClass("hide");
            $("#reverify").toggleClass("hide");
        }
        // State 1 - Ready & Verifying
        if (subState === 'READY' && verificationState === '0') {

        }
        // State 2 - Ready & Verified
        else if (subState === 'READY' && verificationState === '1') {
            $("#reinstate").toggleClass("hide");
            $("#modify").toggleClass("hide");
            $("#delete").toggleClass("hide");
        }
        // State 3 - Ready & Unverified
        else if (subState === 'READY' && verificationState === '-1') {
            $("#force_delete").toggleClass("hide");
            $("#force_reinstate").toggleClass("hide");
            $("#reverify").toggleClass("hide");
        }
        // State 4 - Failed & Verifying
        else if (subState === 'FAILED' && verificationState === '0') {

        }
        // State 5 - Failed & Verified
        else if (subState === 'FAILED' && verificationState === '1') {
            $("#force_reinstate").toggleClass("hide");
            $("#force_modify").toggleClass("hide");
            $("#delete").toggleClass("hide");
        }
        // State 6 - Failed & Unverified
        else if (subState === 'FAILED' && verificationState === '-1') {
            $("#force_delete").toggleClass("hide");
            $("#force_reinstate").toggleClass("hide");
            $("#force_retry").toggleClass("hide");
            $("#reverify").toggleClass("hide");
        }
    } else if (superState === 'Reinstate') {
        // State 0 - Stuck
        if (verificationState === "" || verificationState === "null" || subState === "INIT") {
            $("#force_delete").toggleClass("hide");
            $("#force_retry").toggleClass("hide");
            $("#reverify").toggleClass("hide");
        }
        // State 1 - Ready & Verifying
        if (subState === 'READY' && verificationState === '0') {

        }
        // State 2 - Ready & Verified
        else if (subState === 'READY' && verificationState === '1') {
            $("#cancel").toggleClass("hide");
            $("#modify").toggleClass("hide");
        }
        // State 3 - Ready & Unverified
        else if (subState === 'READY' && verificationState === '-1') {
            $("#force_cancel").toggleClass("hide");
            $("#reverify").toggleClass("hide");
        }
        // State 4 - Failed & Verifying
        else if (subState === 'FAILED' && verificationState === '0') {

        }
        // State 5 - Failed & Verified
        else if (subState === 'FAILED' && verificationState === '1') {
            $("#force_cancel").toggleClass("hide");
            $("#force_modify").toggleClass("hide");
        }
        // State 6 - Failed & Unverified
        else if (subState === 'FAILED' && verificationState === '-1') {
            $("#force_cancel").toggleClass("hide");
            $("#force_retry").toggleClass("hide");
            $("#reverify").toggleClass("hide");
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
            xhr.setRequestHeader("Refresh", keycloak.refreshToken);
        },
        success: function (result) {
            ele.innerHTML = result;

            deltaModerate();
            instructionModerate();
            buttonModerate();
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