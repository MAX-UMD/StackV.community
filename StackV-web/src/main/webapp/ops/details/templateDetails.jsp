<%@page contentType="text/html" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8">
        <title>Service Details</title>

        <link rel='stylesheet prefetch' href='https://fonts.googleapis.com/css?family=Roboto:400,100,400italic,700italic,700'>
        <link rel="stylesheet" href="/StackV-web/css/style.css">
        <link rel="stylesheet" href="/StackV-web/css/jquery-ui.min.css">
        <link rel="stylesheet" href="/StackV-web/css/jquery-ui.structure.min.css">
        <link rel="stylesheet" href="/StackV-web/css/jquery-ui.theme.css">

        <link rel="stylesheet" type="text/css" href="/StackV-web/data/DataTables/datatables.min.css"/>
    </head>

    <body>
        <div id="black-screen"></div>
        <!-- NAV BAR -->
        <div id="nav">
        </div>
        <div id="sub-nav">            
        </div>
        <!-- TAG PANEL -->
        <div id="tag-panel">
        </div>
        <!-- MAIN PANEL -->
        <div class="sub-main" id="main-pane">
            <div id="details-panel">
                <!--Instance Table-->
                <table id="instance-details-table" class="management-table">
                    <thead>
                        <tr>
                            <th>Instance Details</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Instance Alias</td>
                            <td id="instance-alias"></td>
                        </tr>
                        <tr>
                            <td>Reference UUID</td>
                            <td id="instance-uuid"></td>
                        </tr>
                        <tr>
                            <td>Creation Time</td>
                            <td id="instance-creation-time"></td>
                        </tr>
                        <tr>
                            <td>Instance State</td>
                            <td id="instance-superstate"></td>
                        </tr>
                        <tr>
                            <td>Operation Status</td>
                            <td><p style="display: inline;" id="instance-substate"></p><small id="instance-laststate"></small></td>
                        </tr>
                        <tr class="instruction-row">
                            <td colspan="2"><div id="instruction-block"></div></td>
                        </tr>
                        <tr class="button-row">
                            <td colspan="2">
                                <div class="service-instance-panel">
                                    <button class="btn btn-default hide instance-command" id="reinstate">Reinstate</button>
                                    <button class="btn btn-default hide instance-command" id="force_reinstate">Force Reinstate</button>
                                    <button class="btn btn-default hide instance-command" id="cancel">Cancel</button>
                                    <button class="btn btn-default hide instance-command" id="force_cancel">Force Cancel</button>
                                    <button class="btn btn-default hide instance-command" id="force_retry">Force Retry</button>
                                    <button class="btn btn-default hide instance-command" id="modify">Modify</button>
                                    <button class="btn btn-default hide instance-command" id="force_modify">Force Modify</button>
                                    <button class="btn btn-default hide instance-command" id="verify">Verify</button>
                                    <button class="btn btn-default hide instance-command" id="unverify">Cancel Verification</button>
                                    <button class="btn btn-default hide instance-command" id="delete">Delete</button>
                                    <button class="btn btn-default hide service-operation instance-command" id="propagate">Propagate</button>
                                    <button class="btn btn-default hide service-operation instance-command" id="commit">Commit</button>
                                </div>
                            </td>
                        </tr>
                    </tbody>                                        
                </table>                                                                                               

                <!--ACL Table-->
                <table class="management-table hide acl-table">
                    <thead class="delta-table-header">
                        <tr>
                            <th></th>
                            <th>Access Control</th>
                        </tr>
                    </thead>
                    <tbody class="delta-table-body" id="acl-body">
                        <tr>
                            <td>
                                <select id="acl-select" size="5" name="acl-select" multiple=""></select>
                            </td>
                        </tr>
                        <tr>
                            <td><label>Give user access: <input type="text" name="acl-input"></label></td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div id="logging-panel">
                <div id="logging-header-div">
                    Logs
                    <div style="float:right;">
                        <label for="logging-filter-level" style="font-weight: normal;margin-left: 15px;">Logging Level</label>
                        <select id="logging-filter-level" onchange="filterLogs()">
                            <option value="TRACE" selected>TRACE</option>
                            <option value="INFO">INFO</option>
                            <option value="WARN">WARN</option>
                            <option value="ERROR">ERROR</option>
                        </select> 
                    </div>
                </div>
                <div id="logging-body-div">
                    <table id="loggingData" class="table table-striped table-bordered display" cellspacing="0" width="100%">
                        <thead>
                            <tr>
                                <th></th>
                                <th>Timestamp</th>
                                <th>Event</th>
                                <th>Reference UUID</th>
                                <th>Level</th>                                
                            </tr>
                        </thead>
                        <tfoot>
                            <tr>
                                <th></th>
                                <th>Timestamp</th>
                                <th>Event</th>
                                <th>Reference UUID</th>
                                <th>Level</th>                                
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
            <div id="visual-panel"></div>

            <div id="loading-panel"></div>
        </div>
        <div id="details-viz" ></div>


        <script src="/StackV-web/js/keycloak.js"></script>
        <script src="/StackV-web/js/greensock/TweenLite.min.js"></script>
        <script src="/StackV-web/js/greensock/plugins/CSSPlugin.min.js"></script>
        <script src="/StackV-web/js/jquery/jquery.js"></script>
        <script src="/StackV-web/js/jquery-ui.min.js"></script>
        <script src="/StackV-web/js/bootstrap.js"></script>
        <script src="https://unpkg.com/sweetalert/dist/sweetalert.min.js"></script>

        <script src="/StackV-web/js/mousetrap.js"></script>
        <script src="/StackV-web/js/mousetrap-dict.js"></script>

        <script src="/StackV-web/data/DataTables/datatables.min.js"></script>

        <script src="/StackV-web/js/nexus.js"></script>
        <script src="/StackV-web/js/details.js"></script>

        <script>
                        //Based off http://dojotoolkit.org/documentation/tutorials/1.10/dojo_config/ recommendations
                        dojoConfig = {
                            has: {
                                "dojo-firebug": true,
                                "dojo-debug-messages": true
                            },
                            async: true,
                            parseOnLoad: true,
                            packages: [
                                {
                                    name: "d3",
                                    location: "//d3js.org/",
                                    main: "d3.v3"
                                },
                                {
                                    name: "local",
                                    location: "/StackV-web/js/"
                                }
                            ]
                        };

                        $(function () {
                            $("#dialog_policyAction").dialog({
                                autoOpen: false
                            });
                            $("#dialog_policyData").dialog({
                                autoOpen: false
                            });
                        });
        </script>
        <script src="//ajax.googleapis.com/ajax/libs/dojo/1.10.0/dojo/dojo.js"></script>
    </body>
</html>
