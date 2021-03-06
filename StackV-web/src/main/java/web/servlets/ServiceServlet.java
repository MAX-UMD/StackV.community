/* 
 * Copyright (c) 2013-2016 University of Maryland
 * Created by: Alberto Jimenez 2015
 * Modified by: Tao-Hung Yang 2016
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
package web.servlets;

import web.beans.serviceBeans;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.Properties;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.*;
import java.sql.PreparedStatement;
import java.util.Arrays;
import java.util.concurrent.ThreadPoolExecutor;
import javax.servlet.AsyncContext;
import javax.servlet.annotation.WebServlet;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import web.async.AppAsyncListener;
import web.async.DriverWorker;

@WebServlet(asyncSupported = true, value = "/ServiceServlet")
public class ServiceServlet extends HttpServlet {

    serviceBeans servBean = new serviceBeans();
    private final String front_db_user = "front_view";
    private final String front_db_pass = "frontuser";
    String host = "http://localhost:8080/StackV-web/restapi";

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        long startTime = System.currentTimeMillis();
        System.out.println("Service Servlet Start::Name="
                + Thread.currentThread().getName() + "::ID="
                + Thread.currentThread().getId());

        try {
            // Instance Creation
            String serviceString = "";
            HashMap<String, String> paraMap = new HashMap<>();
            Enumeration paramNames = request.getParameterNames();

            // Select the correct service.
            if (request.getParameter("driverID") != null) { // Driver
                serviceString = "driver";
            } else if (request.getParameter("netCreate") != null) { // Network Creation
                serviceString = "netcreate";
            } else if (request.getParameter("dncCreate") != null) {
                serviceString = "dnc";
            } else if (request.getParameter("driverType") != null) { // VM
                serviceString = "vmadd";
            } else if (request.getParameter("fl2pCreate") != null) {
                serviceString = "fl2p";
            } else if (request.getParameter("hybridCloud") != null) {
                serviceString = "hybridcloud";
            } else {
                response.sendRedirect("/StackV-web/errorPage.jsp");
            }

            // Create paraMap.
            while (paramNames.hasMoreElements()) {
                String paramName = (String) paramNames.nextElement();
                String[] paramValues = request.getParameterValues(paramName);
                if (paramValues.length == 1) {
                    String paramValue = paramValues[0];
                    paraMap.put(paramName, paramValue);
                } else if (paramValues.length > 1) {
                    String fullValue = "";
                    for (String paramValue : paramValues) {
                        fullValue += paramValue + "\r\n";
                    }
                    fullValue = fullValue.substring(0, fullValue.length() - 4);
                    paraMap.put(paramName, fullValue);
                }
            }

            // Parse Service.
            switch (serviceString) {
                case "driver":
                    // Driver
                    response.sendRedirect(createDriverInstance(request, paraMap));
                    break;
                case "netcreate":
                    // Virtual Cloud Network
                    response.sendRedirect(parseFullNetwork(request, paraMap));
                    break;
                case "hybridcloud":
                    // Hybrid Cloud
                    response.sendRedirect(parseHybridCloud(request, paraMap));
                    break;
                default:
                    response.sendRedirect("/StackV-web/errorPage.jsp");
                    break;
            }

        } catch (SQLException ex) {
            Logger.getLogger(ServiceServlet.class.getName()).log(Level.SEVERE, null, ex);
        }

        long endTime = System.currentTimeMillis();
        System.out.println("Service Servlet End::Name="
                + Thread.currentThread().getName() + "::ID="
                + Thread.currentThread().getId() + "::Time Taken="
                + (endTime - startTime) + " ms.");
    }

    /**
     * Returns a short description of the servlet.
     *
     * @return a String containing servlet description
     */
    @Override
    public String getServletInfo() {
        return "";
    }

    public String createDriverInstance(HttpServletRequest request, HashMap<String, String> paraMap) {

        // Handles templates, in this order:
        // OpenStack, Stack Driver, Stub Driver, Generic Driver, AWS Driver 
        if (paraMap.containsKey("template1")) {
            paraMap.put("driverID", "openStackDriver");
            paraMap.put("url", "http://max-vlsr2.dragon.maxgigapop.net:35357/v2.0");
            paraMap.put("NATServer", "");
            paraMap.put("driverEjbPath", "java:module/OpenStackDriver");
            paraMap.put("username", "admin");
            paraMap.put("password", "1234");
            paraMap.put("topologyUri", "urn:ogf:network:openstack.com:openstack-cloud");
            paraMap.put("tenant", "admin");
            paraMap.put("install", "Install");
        } else if (paraMap.containsKey("template3")) {
            paraMap.put("driverID", "stubdriver");
            paraMap.put("topologyUri", "urn:ogf:network:rains.maxgigapop.net:wan:2015:topology");
            paraMap.put("driverEjbPath", "java:module/StubSystemDriver");

            // Reads large stubModelTtl property from file.
            String stubModelTTL = "", nextLine;
            String testingPath = "/Users/max/NetBeansProjects/FrontVis/StackV/StackV-web/"
                    + "src/main/webapp/tools/testing/";
            String ttlFilename = "stub_driver_stubModelTtl";
            try {
                FileReader fr = new FileReader(testingPath + ttlFilename);
                try (BufferedReader br = new BufferedReader(fr)) {
                    while ((nextLine = br.readLine()) != null) {
                        stubModelTTL += nextLine;
                    }
                }
            } catch (FileNotFoundException ex) {
                System.out.println(ttlFilename + " not found.");
            } catch (IOException ex) {
                System.out.println("Error reading " + ttlFilename + ".");
            }

            paraMap.put("stubModelTtl", stubModelTTL);
            paraMap.put("install", "Install");
        } else if (paraMap.containsKey("template4")) {
            paraMap.put("driverID", "versaNSDriver");
            paraMap.put("topologyUri", "urn:ogf:network:sdn.maxgigapop.net:network");
            paraMap.put("driverEjbPath", "java:module/GenericRESTDriver");
            paraMap.put("subsystemBaseUrl", "http://206.196.179.139:8080/VersaNS-0.0.1-SNAPSHOT");
            paraMap.put("install", "Install");
        }

        // Connect dynamically generated elements
        for (int i = 1; i <= 5; i++) {
            if (paraMap.containsKey("apropname" + i)) {
                paraMap.put(paraMap.get("apropname" + i), paraMap.get("apropval" + i));

                paraMap.remove("apropname" + i);
                paraMap.remove("apropval" + i);
            }
        }

        /*
         int retCode = -1;
         // Call appropriate driver control method
         if (paraMap.containsKey("install")) {
         paraMap.remove("install");
         retCode = servBean.driverInstall(paraMap);
         } else if (paraMap.containsKey("uninstall")) {
         retCode = servBean.driverUninstall(paraMap.get("topologyUri"));
         }*/
        // Async setup        
        request.setAttribute("org.apache.catalina.ASYNC_SUPPORTED", true);
        AsyncContext asyncCtx = request.startAsync();
        asyncCtx.addListener(new AppAsyncListener());
        asyncCtx.setTimeout(60000);

        ThreadPoolExecutor executor = (ThreadPoolExecutor) request.getServletContext().getAttribute("executor");

        executor.execute(new DriverWorker(asyncCtx, paraMap));

        return ("/StackV-web/ops/srvc/driver.jsp?ret=0");
    }

    public String parseFullNetwork(HttpServletRequest request, HashMap<String, String> paraMap) throws SQLException {
        for (Object key : paraMap.keySet().toArray()) {
            if (paraMap.get((String) key).isEmpty()) {
                paraMap.remove((String) key);
            }
        }

        String token = paraMap.get("authToken");
        String refresh = paraMap.get("refreshToken");
        String username = paraMap.get("username");

        JSONObject inputJSON = new JSONObject();
        JSONObject dataJSON = new JSONObject();
        inputJSON.put("username", paraMap.get("username"));
        inputJSON.put("type", "netcreate");
        inputJSON.put("alias", paraMap.get("alias"));

        JSONArray cloudArr = new JSONArray();
        JSONObject cloudJSON = new JSONObject();
        cloudJSON.put("type", paraMap.get("netType"));
        cloudJSON.put("cidr", paraMap.get("netCidr"));
        cloudJSON.put("name", "vtn1");
        cloudJSON.put("parent", paraMap.get("topoUri"));

        // Parse gateways.
        // AWS
        JSONArray gatewayArr = new JSONArray();
        if (paraMap.containsKey("conn-dest")) {
            JSONObject gatewayJSON = new JSONObject();
            gatewayJSON.put("name", "aws_dx1");
            gatewayJSON.put("type", "aws_direct_connect");

            JSONArray gateToArr = new JSONArray();
            JSONObject gateToJSON = new JSONObject();

            String connString = paraMap.get("conn-dest");
            if (paraMap.containsKey("conn-vlan")) {
                connString += "?vlan=" + paraMap.get("conn-vlan");
            } else {
                connString += "?vlan=any";
            }
            gateToJSON.put("value", connString);
            gateToJSON.put("type", "stitch_port");

            gateToArr.add(gateToJSON);
            gatewayJSON.put("to", gateToArr);
            gatewayArr.add(gatewayJSON);
        }
        // OpenStack
        for (int i = 1; i <= 10; i++) {
            if (paraMap.containsKey("gateway" + i + "-name")) {
                JSONObject gatewayJSON = new JSONObject();
                gatewayJSON.put("name", paraMap.get("gateway" + i + "-name"));
                if (paraMap.containsKey("gateway" + i + "type-select")) {
                    gatewayJSON.put("type", paraMap.get("gateway" + i + "type-select"));
                } else {
                    gatewayJSON.put("type", "ucs_port_profile");
                }

                if (paraMap.containsKey("gateway" + i + "-from")) {
                    JSONArray fromArr = new JSONArray();
                    JSONObject fromJSON = new JSONObject();
                    fromJSON.put("value", paraMap.get("gateway" + i + "-from"));
                    fromJSON.put("type", paraMap.get("gateway" + i + "-type"));

                    fromArr.add(fromJSON);
                    gatewayJSON.put("from", fromArr);
                }
                if (paraMap.containsKey("gateway" + i + "-to")) {
                    JSONArray toArr = new JSONArray();
                    JSONObject toJSON = new JSONObject();
                    toJSON.put("value", paraMap.get("gateway" + i + "-to"));
                    toJSON.put("type", paraMap.get("gateway" + i + "-type"));

                    toArr.add(toJSON);
                    gatewayJSON.put("to", toArr);
                }

                gatewayArr.add(gatewayJSON);
            }
        }
        cloudJSON.put("gateways", gatewayArr);

        // Process each subnet.
        JSONArray subnetArr = new JSONArray();
        for (int i = 1; i <= 10; i++) {
            if (paraMap.containsKey("subnet" + i + "-cidr")) {
                JSONObject subnetJSON = new JSONObject();
                subnetJSON.put("cidr", paraMap.get("subnet" + i + "-cidr"));

                subnetJSON.put("name", paraMap.containsKey("subnet" + i + "-name") ? paraMap.get("subnet" + i + "-name") : " ");

                // Process each routes.
                JSONArray routeArr = new JSONArray();
                for (int j = 1; j <= 10; j++) {
                    // Check for subroute existence.
                    JSONObject routeJSON = new JSONObject();
                    if (paraMap.containsKey("subnet" + i + "-route" + j + "-to")) {
                        JSONObject toJSON = new JSONObject();
                        toJSON.put("value", paraMap.get("subnet" + i + "-route" + j + "-to"));
                        toJSON.put("type", "ipv4-prefix");
                        routeJSON.put("to", toJSON);
                    }

                    if (paraMap.containsKey("subnet" + i + "-route" + j + "-from")) {
                        JSONObject fromJSON = new JSONObject();
                        fromJSON.put("value", paraMap.get("subnet" + i + "-route" + j + "-from"));
                        routeJSON.put("from", fromJSON);
                    }
                    if (paraMap.containsKey("subnet" + i + "-route" + j + "-next")) {
                        JSONObject nextJSON = new JSONObject();
                        nextJSON.put("value", paraMap.get("subnet" + i + "-route" + j + "-next"));
                        routeJSON.put("next_hop", nextJSON);
                    }

                    if (!routeJSON.isEmpty()) {
                        routeArr.add(routeJSON);
                    }
                }

                // Apply route propagation
                if (paraMap.containsKey("subnet" + i + "-route-prop")) {
                    JSONObject routeJSON = new JSONObject();

                    JSONObject fromJSON = new JSONObject();
                    fromJSON.put("value", "vpn");
                    routeJSON.put("from", fromJSON);

                    JSONObject toJSON = new JSONObject();
                    toJSON.put("value", "0.0.0.0/0");
                    toJSON.put("type", "ipv4-prefix");
                    routeJSON.put("to", toJSON);

                    JSONObject nextJSON = new JSONObject();
                    nextJSON.put("value", "vpn");
                    routeJSON.put("next_hop", nextJSON);

                    routeArr.add(routeJSON);
                } else if (paraMap.containsKey("subnet" + i + "-route-default")) {
                    JSONObject routeJSON = new JSONObject();

                    JSONObject toJSON = new JSONObject();
                    toJSON.put("value", "0.0.0.0/0");
                    toJSON.put("type", "ipv4-prefix");
                    routeJSON.put("to", toJSON);

                    JSONObject nextJSON = new JSONObject();
                    nextJSON.put("value", "internet");
                    routeJSON.put("next_hop", nextJSON);

                    routeArr.add(routeJSON);
                }

                if (!routeArr.isEmpty()) {
                    subnetJSON.put("routes", routeArr);
                }

                // Process VMs.
                JSONArray vmArr = new JSONArray();
                for (int j = 1; j <= 10; j++) {
                    if (paraMap.containsKey("vm" + j + "-subnet") && (Integer.parseInt(paraMap.get("vm" + j + "-subnet")) == i)) {
                        
                        System.out.println("Entering VMs");
                        
                        JSONObject vmJSON = new JSONObject();
                        if (paraMap.get("netHost").equalsIgnoreCase("aws")) {
                            vmJSON.put("name", paraMap.get("vm" + j + "-name"));

                            // Parse Types.
                            String vmString = "";
                            if (paraMap.containsKey("vm" + j + "-instance")) {
                                vmString += "instance+" + paraMap.get("vm" + j + "-instance");
                            }
                            if (paraMap.containsKey("vm" + j + "-security")) {
                                if (!vmString.isEmpty()) {
                                    vmString += ",";
                                }
                                vmString += "secgroup+" + paraMap.get("vm" + j + "-security");
                            }
                            if (paraMap.containsKey("vm" + j + "-image")) {
                                if (!vmString.isEmpty()) {
                                    vmString += ",";
                                }
                                vmString += "image+" + paraMap.get("vm" + j + "-image");
                            }
                            if (paraMap.containsKey("vm" + j + "-keypair")) {
                                if (!vmString.isEmpty()) {
                                    vmString += ",";
                                }
                                vmString += "keypair+" + paraMap.get("vm" + j + "-keypair");
                            }
                            if (!vmString.isEmpty()) {
                                vmJSON.put("type", vmString);
                            }

                            // not implemented yet
                            JSONArray interfaceArr = new JSONArray();
                            if (true) {
                                JSONObject interfaceJSON = new JSONObject();

                                interfaceArr.add(interfaceJSON);
                            }
                        } else if (paraMap.get("netHost").equalsIgnoreCase("ops")) {
                            vmJSON.put("name", paraMap.get("vm" + j + "-name"));
                            vmJSON.put("host", paraMap.get("vm" + j + "-host"));

                            // Parse Types.
                            String vmString = "";
                            if (paraMap.containsKey("vm" + j + "-instance")) {
                                vmString += "instance+" + paraMap.get("vm" + j + "-instance");
                            }
                            if (paraMap.containsKey("vm" + j + "-security")) {
                                if (!vmString.isEmpty()) {
                                    vmString += ",";
                                }
                                vmString += "secgroup+" + paraMap.get("vm" + j + "-security");
                            }
                            if (paraMap.containsKey("vm" + j + "-image")) {
                                if (!vmString.isEmpty()) {
                                    vmString += ",";
                                }
                                vmString += "image+" + paraMap.get("vm" + j + "-image");
                            }
                            if (paraMap.containsKey("vm" + j + "-keypair")) {
                                if (!vmString.isEmpty()) {
                                    vmString += ",";
                                }
                                vmString += "keypair+" + paraMap.get("vm" + j + "-keypair");
                            }
                            if (!vmString.isEmpty()) {
                                vmJSON.put("type", vmString);
                            }

                            //Parse Interfaces: either floating IP or SRIOV connection
                            JSONArray interfaceArr = new JSONArray();
                            //check if assigning floating IP
                            if (paraMap.containsKey("vm" + j + "-floating")) {
                                JSONObject interfaceJSON = new JSONObject();
                                interfaceJSON.put("name", paraMap.get("vm" + j + "-name") + ":eth0");
                                interfaceJSON.put("type", "Ethernet");
                                interfaceJSON.put("address", "ipv4+" + paraMap.get("vm" + j + "-floating") + "/255.255.255.0");
                                interfaceArr.add(interfaceJSON);

                                //Process SRIOV only when a floating IP is assigned
                                for (int k = 1; k <= 10; k++) {
                                    if (paraMap.containsKey("SRIOV" + k + "-ip") && Integer.parseInt(paraMap.get("SRIOV" + k + "-vm")) == j) {
                                        JSONObject sriovJSON = new JSONObject();
                                        String addrString = "ipv4+" + paraMap.get("SRIOV" + k + "-ip") + "/255.255.255.0";
                                        addrString += ",mac+" + paraMap.get("SRIOV" + k + "-mac");
                                        sriovJSON.put("address", addrString);
                                        sriovJSON.put("name", paraMap.get("vm" + j + "-name") + ":eth" + k);
                                        sriovJSON.put("type", "SRIOV");
                                        sriovJSON.put("gateway", paraMap.get("gateway" + paraMap.get("SRIOV" + k + "-gateway") + "-name"));

                                        interfaceArr.add(sriovJSON);
                                    }

                                }
                            }
                            vmJSON.put("interfaces", interfaceArr);
                        }

                        // Process each routes.
                        JSONArray vmRouteArr = new JSONArray();
                        for (int k = 1; k <= 10; k++) {
                            // Check for subroute existence.
                            JSONObject routeJSON = new JSONObject();
                            if (paraMap.containsKey("vm" + j + "-route" + k + "-to")) {
                                JSONObject toJSON = new JSONObject();
                                toJSON.put("value", paraMap.get("vm" + j + "-route" + k + "-to"));
                                toJSON.put("type", "ipv4-prefix");
                                routeJSON.put("to", toJSON);
                            }

                            if (paraMap.containsKey("vm" + j + "-route" + k + "-from")) {
                                JSONObject fromJSON = new JSONObject();
                                fromJSON.put("value", paraMap.get("vm" + j + "-route" + k + "-from"));
                                routeJSON.put("from", fromJSON);
                            }
                            if (paraMap.containsKey("vm" + j + "-route" + k + "-next")) {
                                JSONObject nextJSON = new JSONObject();
                                nextJSON.put("value", paraMap.get("vm" + j + "-route" + k + "-next"));
                                routeJSON.put("next_hop", nextJSON);
                            }

                            if (!routeJSON.isEmpty()) {
                                vmRouteArr.add(routeJSON);
                            }
                        }

                        if (!vmRouteArr.isEmpty()) {
                            vmJSON.put("routes", vmRouteArr);
                        }
                        if (!vmJSON.isEmpty()) {
                            vmArr.add(vmJSON);
                        }
                    }
                }
                subnetJSON.put("virtual_machines", vmArr);
                subnetArr.add(subnetJSON);
            }
        }
        cloudJSON.put("subnets", subnetArr);

        // Parse network routes.
        JSONArray netRouteArr = new JSONArray();
        JSONObject netRouteJSON = new JSONObject();

        JSONObject toJSON = new JSONObject();
        toJSON.put("value", "0.0.0.0/0");
        toJSON.put("type", "ipv4-prefix");
        netRouteJSON.put("to", toJSON);

        JSONObject nextJSON = new JSONObject();
        nextJSON.put("value", "internet");
        netRouteJSON.put("next_hop", nextJSON);

        netRouteArr.add(netRouteJSON);
        cloudJSON.put("routes", netRouteArr);

        cloudArr.add(cloudJSON);
        dataJSON.put("virtual_clouds", cloudArr);
        inputJSON.put("data", dataJSON);

        if (paraMap.containsKey("profile-save")) {
            Properties front_connectionProps = new Properties();
            front_connectionProps.put("user", front_db_user);
            front_connectionProps.put("password", front_db_pass);
            Connection front_conn = DriverManager.getConnection("jdbc:mysql://localhost:3306/frontend",
                    front_connectionProps);

            int serviceID = servBean.getServiceID("netcreate");

            // Install Profile into DB.
            PreparedStatement prep = front_conn.prepareStatement("INSERT INTO `frontend`.`service_wizard` "
                    + "(`service_id`, `username`, `name`, `wizard_json`, `description`, `editable`) VALUES (?, ?, ?, ?, ?, ?)");
            prep.setInt(1, serviceID);
            prep.setString(2, username);
            prep.setString(3, paraMap.get("profile-name"));
            prep.setString(4, inputJSON.toString());
            prep.setString(5, paraMap.get("profile-description"));
            prep.setInt(6, 0);
            prep.executeUpdate();
        }
        if (paraMap.containsKey("submit")) {
            request.setAttribute("org.apache.catalina.ASYNC_SUPPORTED", true);
            AsyncContext asyncCtx = request.startAsync();
            asyncCtx.addListener(new AppAsyncListener());
            asyncCtx.setTimeout(300000);

            ThreadPoolExecutor executor = (ThreadPoolExecutor) request.getServletContext().getAttribute("executor");
            executor.execute(new APIRunner(inputJSON, token, refresh));
        }

        return ("/StackV-web/ops/catalog.jsp");
    }

    public String parseHybridCloud(HttpServletRequest request, HashMap<String, String> paraMap) throws SQLException {
        for (Object key : paraMap.keySet().toArray()) {
            if (paraMap.get((String) key).isEmpty()) {
                paraMap.remove((String) key);
            }
        }

        String token = paraMap.get("authToken");
        String refresh = paraMap.get("refreshToken");
        String username = paraMap.get("username");

        JSONObject inputJSON = new JSONObject();
        JSONObject dataJSON = new JSONObject();
        inputJSON.put("username", username);
        inputJSON.put("type", "hybridcloud");
        inputJSON.put("alias", paraMap.get("alias"));

        JSONArray cloudArr = new JSONArray();
        for (int type = 1; type <= 2; type++) {
            String typeStr;
            if (type == 1) {
                typeStr = "aws-";
            } else {
                typeStr = "ops-";
            }

            JSONObject cloudJSON = new JSONObject();
            cloudJSON.put("type", "internal");
            cloudJSON.put("cidr", paraMap.get(typeStr + "netCidr"));
            cloudJSON.put("name", "vtn" + type);
            cloudJSON.put("parent", paraMap.get(typeStr + "topoUri"));

            // Parse gateways.
            // AWS
            JSONArray gatewayArr = new JSONArray();
            /*if (type == 1 && paraMap.containsKey(typeStr + "conn-dest")) {
             JSONObject gatewayJSON = new JSONObject();
             gatewayJSON.put("name", "aws_dx1");
             gatewayJSON.put("type", "aws_direct_connect");
                
             JSONArray gateToArr = new JSONArray();
             JSONObject gateToJSON = new JSONObject();
                
             String connString = paraMap.get(typeStr + "conn-dest");
             if (paraMap.containsKey(typeStr + "conn-vlan")) {
             connString += "?vlan=" + paraMap.get(typeStr + "conn-vlan");
             } else {
             connString += "?vlan=any";
             }
             gateToJSON.put("value", connString);
             gateToJSON.put("type", "stitch_port");
                
             gateToArr.add(gateToJSON);
             gatewayJSON.put("to", gateToArr);
             gatewayArr.add(gatewayJSON);
             }*/
            // OpenStack
            if (type == 2) {
                for (int i = 0; i <= 10; i++) {
                    if (paraMap.containsKey("gateway" + i + "-type")) {
                        JSONObject gatewayJSON = new JSONObject();
                        gatewayJSON.put("name", paraMap.containsKey("gateway" + i + "-name") ? paraMap.get("gateway" + i + "-name") : ("gateway" + i));
                        String gatewayType = paraMap.get("gateway" + i + "-type");

                        switch (gatewayType) {
                            case "ucs":
                            case "stitch":
                                gatewayJSON.put("type", "ucs_port_profile");
                                break;
                            case "intercloud":
                                gatewayJSON.put("type", "inter_cloud_network");
                                break;
                        }

                        if (gatewayType.equals("ucs") || gatewayType.equals("stitch")) {
                            JSONArray fromArr = new JSONArray();
                            JSONObject fromJSON = new JSONObject();
                            fromJSON.put("value", paraMap.get("gateway" + i + "-value"));
                            fromJSON.put("type", "port_profile");

                            fromArr.add(fromJSON);
                            gatewayJSON.put("from", fromArr);
                        }
                        if (gatewayType.equals("intercloud")) {
                            JSONArray toArr = new JSONArray();
                            JSONObject toJSON = new JSONObject();
                            toJSON.put("value", "urn:ogf:network:aws.amazon.com:aws-cloud?vlan=" + paraMap.get("aws-conn-vlan"));
                            toJSON.put("type", "peer_cloud");

                            toArr.add(toJSON);
                            gatewayJSON.put("to", toArr);
                        }

                        gatewayArr.add(gatewayJSON);
                    }
                }
                cloudJSON.put("gateways", gatewayArr);
            }

            // Process each subnet.
            JSONArray subnetArr = new JSONArray();
            for (int i = 1; i <= 10; i++) {
                if (paraMap.containsKey(typeStr + "subnet" + i + "-cidr")) {
                    JSONObject subnetJSON = new JSONObject();
                    subnetJSON.put("cidr", paraMap.get(typeStr + "subnet" + i + "-cidr"));
                    subnetJSON.put("name", paraMap.containsKey(typeStr + "subnet" + i + "-name") ? paraMap.get(typeStr + "subnet" + i + "-name") : ("subnet" + i));

                    // Process each routes.
                    JSONArray routeArr = new JSONArray();
                    for (int j = 1; j <= 10; j++) {
                        // Check for subroute existence.
                        JSONObject routeJSON = new JSONObject();
                        if (paraMap.containsKey(typeStr + "subnet" + i + "-route" + j + "-to")) {
                            JSONObject toJSON = new JSONObject();
                            toJSON.put("value", paraMap.get(typeStr + "subnet" + i + "-route" + j + "-to"));
                            toJSON.put("type", "ipv4-prefix");
                            routeJSON.put("to", toJSON);
                        }

                        if (paraMap.containsKey(typeStr + "subnet" + i + "-route" + j + "-from")) {
                            JSONObject fromJSON = new JSONObject();
                            fromJSON.put("value", paraMap.get(typeStr + "subnet" + i + "-route" + j + "-from"));
                            routeJSON.put("from", fromJSON);
                        }
                        if (paraMap.containsKey(typeStr + "subnet" + i + "-route" + j + "-next")) {
                            JSONObject nextJSON = new JSONObject();
                            nextJSON.put("value", paraMap.get(typeStr + "subnet" + i + "-route" + j + "-next"));
                            routeJSON.put("next_hop", nextJSON);
                        }

                        if (!routeJSON.isEmpty()) {
                            routeArr.add(routeJSON);
                        }
                    }

                    // Apply route propagation                    
                    if (true) {
                        JSONObject routeJSON = new JSONObject();

                        JSONObject fromJSON = new JSONObject();
                        fromJSON.put("value", "vpn");
                        routeJSON.put("from", fromJSON);

                        JSONObject toJSON = new JSONObject();
                        toJSON.put("value", "0.0.0.0/0");
                        routeJSON.put("to", toJSON);

                        JSONObject nextJSON = new JSONObject();
                        nextJSON.put("value", "vpn");
                        routeJSON.put("next_hop", nextJSON);

                        routeArr.add(routeJSON);
                    }
                    if (true) {
                        JSONObject routeJSON = new JSONObject();

                        JSONObject toJSON = new JSONObject();
                        toJSON.put("value", "0.0.0.0/0");
                        toJSON.put("type", "ipv4-prefix");
                        routeJSON.put("to", toJSON);

                        JSONObject nextJSON = new JSONObject();
                        nextJSON.put("value", "internet");
                        routeJSON.put("next_hop", nextJSON);

                        routeArr.add(routeJSON);
                    }

                    if (!routeArr.isEmpty()) {
                        subnetJSON.put("routes", routeArr);
                    }

                    // Process VMs.
                    JSONArray vmArr = new JSONArray();
                    for (int j = 1; j <= 10; j++) {
                        if (paraMap.containsKey(typeStr + "vm" + j + "-subnet") && (Integer.parseInt(paraMap.get(typeStr + "vm" + j + "-subnet")) == i)) {
                            JSONObject vmJSON = new JSONObject();
                            if (typeStr.equals("aws-")) {
                                vmJSON.put("name", paraMap.containsKey(typeStr + "vm" + j + "-name") ? paraMap.get(typeStr + "vm" + j + "-name") : ("vm" + i));

                                // Parse Types.
                                String vmString = "";
                                if (paraMap.containsKey(typeStr + "vm" + j + "-instance")) {
                                    vmString += "instance+" + paraMap.get(typeStr + "vm" + j + "-instance");
                                }
                                if (paraMap.containsKey(typeStr + "vm" + j + "-security")) {
                                    if (!vmString.isEmpty()) {
                                        vmString += ",";
                                    }
                                    vmString += "secgroup+" + paraMap.get(typeStr + "vm" + j + "-security");
                                }
                                if (paraMap.containsKey(typeStr + "vm" + j + "-image")) {
                                    if (!vmString.isEmpty()) {
                                        vmString += ",";
                                    }
                                    vmString += "image+" + paraMap.get(typeStr + "vm" + j + "-image");
                                }
                                if (paraMap.containsKey(typeStr + "vm" + j + "-keypair")) {
                                    if (!vmString.isEmpty()) {
                                        vmString += ",";
                                    }
                                    vmString += "keypair+" + paraMap.get(typeStr + "vm" + j + "-keypair");
                                }
                                if (!vmString.isEmpty()) {
                                    vmJSON.put("type", vmString);
                                }

                                // not implemented yet
                                JSONArray interfaceArr = new JSONArray();
                                if (true) {
                                    JSONObject interfaceJSON = new JSONObject();

                                    interfaceArr.add(interfaceJSON);
                                }
                            } else if (typeStr.equals("ops-")) {
                                vmJSON.put("name", paraMap.containsKey(typeStr + "vm" + j + "-name") ? paraMap.get(typeStr + "vm" + j + "-name") : ("vm" + i));
                                vmJSON.put("host", paraMap.get(typeStr + "vm" + j + "-host"));

                                // Parse Types.
                                String vmString = "";
                                if (paraMap.containsKey(typeStr + "vm" + j + "-instance")) {
                                    vmString += "instance+" + paraMap.get(typeStr + "vm" + j + "-instance");
                                }
                                if (paraMap.containsKey(typeStr + "vm" + j + "-security")) {
                                    if (!vmString.isEmpty()) {
                                        vmString += ",";
                                    }
                                    vmString += "secgroup+" + paraMap.get(typeStr + "vm" + j + "-security");
                                }
                                if (paraMap.containsKey(typeStr + "vm" + j + "-image")) {
                                    if (!vmString.isEmpty()) {
                                        vmString += ",";
                                    }
                                    vmString += "image+" + paraMap.get(typeStr + "vm" + j + "-image");
                                }
                                if (paraMap.containsKey(typeStr + "vm" + j + "-keypair")) {
                                    if (!vmString.isEmpty()) {
                                        vmString += ",";
                                    }
                                    vmString += "keypair+" + paraMap.get(typeStr + "vm" + j + "-keypair");
                                }
                                if (!vmString.isEmpty()) {
                                    vmJSON.put("type", vmString);
                                }

                                //Parse Interfaces: either floating IP or SRIOV connection
                                JSONArray interfaceArr = new JSONArray();
                                //check if assigning floating IP
                                if (paraMap.containsKey(typeStr + "vm" + j + "-floating")) {
                                    JSONObject interfaceJSON = new JSONObject();
                                    interfaceJSON.put("name", paraMap.get(typeStr + "vm" + j + "-name") + ":eth0");
                                    interfaceJSON.put("type", "Ethernet");
                                    interfaceJSON.put("address", "ipv4+" + paraMap.get(typeStr + "vm" + j + "-floating"));
                                    interfaceArr.add(interfaceJSON);

                                    //Process SRIOV only when a floating IP is assigned
                                    for (int k = 1; k <= 10; k++) {
                                        if (paraMap.containsKey("vm" + j + "-SRIOV" + k + "-ip")) {
                                            JSONObject sriovJSON = new JSONObject();
                                            String addrString = "ipv4+" + paraMap.get("vm" + j + "-SRIOV" + k + "-ip");
                                            addrString += ",mac+" + paraMap.get("vm" + j + "-SRIOV" + k + "-mac");
                                            sriovJSON.put("address", addrString);
                                            sriovJSON.put("name", paraMap.get(typeStr + "vm" + j + "-name") + ":eth" + k);
                                            sriovJSON.put("type", "SRIOV");
                                            sriovJSON.put("gateway", paraMap.get("gateway" + paraMap.get("vm" + j + "-SRIOV" + k + "-gateway") + "-name"));

                                            interfaceArr.add(sriovJSON);
                                        }

                                    }
                                }
                                vmJSON.put("interfaces", interfaceArr);

                                //Parse CEPH volumes
                                JSONArray volumeArr = new JSONArray();
                                for (int k = 1; k <= 10; k++) {
                                    if (paraMap.containsKey(typeStr + "vm" + j + "-volume" + k + "-mount")) {
                                        JSONObject volumeJSON = new JSONObject();

                                        volumeJSON.put("mount_point", paraMap.get(typeStr + "vm" + j + "-volume" + k + "-mount"));
                                        volumeJSON.put("disk_gb", paraMap.get(typeStr + "vm" + j + "-volume" + k + "-size"));

                                        volumeArr.add(volumeJSON);
                                    }
                                }
                                if (!volumeArr.isEmpty()) {
                                    vmJSON.put("ceph_rbd", volumeArr);
                                }

                                //Parse BGP
                                JSONObject bgpJSON = new JSONObject();
                                if (paraMap.containsKey("bgp-number") && paraMap.containsKey("bgp-vm")
                                        && (Integer.parseInt(paraMap.get("bgp-vm")) == j)) {
                                    JSONArray neighborArr = new JSONArray();
                                    JSONObject neighborJSON = new JSONObject();

                                    neighborJSON.put("remote_asn", paraMap.get("bgp-number"));
                                    neighborJSON.put("bgp_authkey", paraMap.get("bgp-key"));
                                    neighborArr.add(neighborJSON);
                                    bgpJSON.put("neighbors", neighborArr);

                                    JSONArray networkArr = new JSONArray();
                                    String[] networkSplit = paraMap.get("bgp-networks").split(",");
                                    networkArr.addAll(Arrays.asList(networkSplit));
                                    bgpJSON.put("networks", networkArr);
                                }
                                if (!bgpJSON.isEmpty()) {
                                    vmJSON.put("quagga_bgp", bgpJSON);
                                }
                            }

                            // Process each routes.
                            JSONArray vmRouteArr = new JSONArray();
                            for (int k = 1; k <= 10; k++) {
                                // Check for subroute existence.
                                JSONObject routeJSON = new JSONObject();
                                if (paraMap.containsKey(typeStr + "vm" + j + "-route" + k + "-to")) {
                                    JSONObject toJSON = new JSONObject();
                                    toJSON.put("value", paraMap.get(typeStr + "vm" + j + "-route" + k + "-to"));
                                    //toJSON.put("type", "ipv4-prefix");
                                    routeJSON.put("to", toJSON);
                                }

                                if (paraMap.containsKey(typeStr + "vm" + j + "-route" + k + "-from")) {
                                    JSONObject fromJSON = new JSONObject();
                                    fromJSON.put("value", paraMap.get(typeStr + "vm" + j + "-route" + k + "-from"));
                                    routeJSON.put("from", fromJSON);
                                }
                                if (paraMap.containsKey(typeStr + "vm" + j + "-route" + k + "-next")) {
                                    JSONObject nextJSON = new JSONObject();
                                    nextJSON.put("value", paraMap.get(typeStr + "vm" + j + "-route" + k + "-next"));
                                    routeJSON.put("next_hop", nextJSON);
                                }

                                if (!routeJSON.isEmpty()) {
                                    vmRouteArr.add(routeJSON);
                                }
                            }

                            if (!vmRouteArr.isEmpty()) {
                                vmJSON.put("routes", vmRouteArr);
                            }
                            if (!vmJSON.isEmpty()) {
                                vmArr.add(vmJSON);
                            }
                        }
                    }
                    subnetJSON.put("virtual_machines", vmArr);
                    subnetArr.add(subnetJSON);
                }
            }
            cloudJSON.put("subnets", subnetArr);

            // Parse network routes.
            JSONArray netRouteArr = new JSONArray();
            JSONObject netRouteJSON = new JSONObject();

            JSONObject toJSON = new JSONObject();
            toJSON.put("value", "0.0.0.0/0");
            toJSON.put("type", "ipv4-prefix");
            netRouteJSON.put("to", toJSON);

            JSONObject nextJSON = new JSONObject();
            nextJSON.put("value", "internet");
            netRouteJSON.put("next_hop", nextJSON);

            netRouteArr.add(netRouteJSON);
            cloudJSON.put("routes", netRouteArr);

            cloudArr.add(cloudJSON);
        }
        dataJSON.put("virtual_clouds", cloudArr);
        inputJSON.put("data", dataJSON);

        if (paraMap.containsKey("profile-save")) {
            Properties front_connectionProps = new Properties();
            front_connectionProps.put("user", front_db_user);
            front_connectionProps.put("password", front_db_pass);
            Connection front_conn = DriverManager.getConnection("jdbc:mysql://localhost:3306/frontend",
                    front_connectionProps);

            int serviceID = servBean.getServiceID("hybridcloud");

            // Install Profile into DB.
            PreparedStatement prep = front_conn.prepareStatement("INSERT INTO `frontend`.`service_wizard` "
                    + "(`service_id`, `username`, `name`, `wizard_json`, `description`, `editable`) VALUES (?, ?, ?, ?, ?, ?)");
            prep.setInt(1, serviceID);
            prep.setString(2, username);
            prep.setString(3, paraMap.get("profile-name"));
            prep.setString(4, inputJSON.toString());
            prep.setString(5, paraMap.get("profile-description"));
            prep.setInt(6, 0);
            prep.executeUpdate();
        }
        if (paraMap.containsKey("submit")) {
            request.setAttribute("org.apache.catalina.ASYNC_SUPPORTED", true);
            AsyncContext asyncCtx = request.startAsync();
            asyncCtx.addListener(new AppAsyncListener());
            asyncCtx.setTimeout(300000);

            ThreadPoolExecutor executor = (ThreadPoolExecutor) request.getServletContext().getAttribute("executor");
            executor.execute(new APIRunner(inputJSON, token, refresh));
        }

        return ("/StackV-web/ops/catalog.jsp");
    }
    
    /*
    public String createFlow(HttpServletRequest request, HashMap<String, String> paraMap) throws SQLException {
        for (Object Key : paraMap.keySet().toArray()) {
            if (paraMap.get((String) Key).isEmpty()) {
                paraMap.remove((String) Key);
            }
        }

        Connection rains_conn;
        Properties rains_connectionProps = new Properties();
        rains_connectionProps.put("user", "root");
        rains_connectionProps.put("password", "root");

        rains_conn = DriverManager.getConnection("jdbc:mysql://localhost:3306/rainsdb",
                rains_connectionProps);

        if (paraMap.containsKey("template1")) {
            //paraMap.put("driverType", "aws");
            paraMap.put("topUri", "urn:ogf:network:domain=vo1.stackv.org:link=link1");
            paraMap.put("eth_src", "urn:ogf:network:onos.maxgigapop.net:network1:of:0000000000000005:port-s5-eth1");
            paraMap.put("eth_des", "urn:ogf:network:onos.maxgigapop.net:network1:of:0000000000000002:port-s2-eth1");
            paraMap.remove("template1");
            paraMap.remove("fl2pCreate");

            servBean.createflow(paraMap);

        } else {
            paraMap.remove("userID");
            paraMap.remove("custom");
            paraMap.remove("fl2pCreate");
            //Process each link

            for (Map.Entry<String, String> entry : paraMap.entrySet()) {
                System.out.println(entry.getKey() + entry.getValue());
            }

            // Async setup 
            request.setAttribute("org.apache.catalina.ASYNC_SUPPORTED", true);
            AsyncContext asyncCtx = request.startAsync();
            asyncCtx.addListener(new AppAsyncListener());
            asyncCtx.setTimeout(60000);

            ThreadPoolExecutor executor = (ThreadPoolExecutor) request.getServletContext().getAttribute("executor");

            executor.execute(new FL2PWorker(asyncCtx, paraMap));
        }
        return ("/StackV-web/ops/srvc/fl2p.jsp?ret=0");

    }

    // @TODO: COMPLETELY INEFFICIENT BUT LOW PRIORITY - SEE WEBRESOURCE
    public String parseConnection(HttpServletRequest request, HashMap<String, String> paraMap) throws SQLException, IOException {
        for (Object key : paraMap.keySet().toArray()) {
            if (paraMap.get((String) key).isEmpty()) {
                paraMap.remove((String) key);
            }
        }

        JSONObject inputJSON = new JSONObject();
        JSONObject dataJSON = new JSONObject();
        inputJSON.put("user", paraMap.get("username"));
        inputJSON.put("type", "dnc");
        inputJSON.put("alias", paraMap.get("alias"));

        //Process each link
        JSONArray linkArr = new JSONArray();
        for (int i = 1; i < 10; i++) {
            if (paraMap.containsKey("linkUri" + i)) {
                JSONObject linkJSON = new JSONObject();
                linkJSON.put("name", paraMap.get("linkUri" + i));

                if (paraMap.containsKey("link" + i + "-src")) {
                    linkJSON.put("src", paraMap.get("link" + i + "-src"));
                }
                if (paraMap.containsKey("link" + i + "-src-vlan")) {
                    linkJSON.put("src-vlan", paraMap.get("link" + i + "-src-vlan"));
                }
                if (paraMap.containsKey("link" + i + "-des")) {
                    linkJSON.put("des", paraMap.get("link" + i + "-des"));
                }
                if (paraMap.containsKey("link" + i + "-des-vlan")) {
                    linkJSON.put("des-vlan", paraMap.get("link" + i + "-des-vlan"));
                }

                linkArr.add(linkJSON);
            }
        }

        dataJSON.put("links", linkArr);
        inputJSON.put("data", dataJSON);

        request.setAttribute("org.apache.catalina.ASYNC_SUPPORTED", true);
        AsyncContext asyncCtx = request.startAsync();
        asyncCtx.addListener(new AppAsyncListener());
        asyncCtx.setTimeout(300000);

        ThreadPoolExecutor executor = (ThreadPoolExecutor) request.getServletContext().getAttribute("executor");
        executor.execute(new APIRunner(inputJSON));

        return ("/StackV-web/ops/srvc/dnc.jsp?ret=0");

    }
    */
}

class APIRunner implements Runnable {

    JSONObject inputJSON;
    String authToken;
    String refreshToken;
    serviceBeans servBean = new serviceBeans();
    String host = "http://localhost:8080/StackV-web/restapi";

    public APIRunner(JSONObject input) {
        inputJSON = input;
    }

    public APIRunner(JSONObject input, String token, String refresh) {
        inputJSON = input;
        authToken = token;
        refreshToken = refresh;
    }

    @Override
    public void run() {
        try {
            System.out.println("API Runner Engaged!");
            URL url = new URL(String.format("%s/app/service/", host));
            HttpURLConnection create = (HttpURLConnection) url.openConnection();
            if (authToken != null && !authToken.isEmpty()) {
                String authHeader = "bearer " + authToken;
                create.setRequestProperty("Authorization", authHeader);
                create.setRequestProperty("Refresh", refreshToken);
            }

            String result = servBean.executeHttpMethod(url, create, "POST", inputJSON.toJSONString(), null);
        } catch (IOException ex) {
            Logger.getLogger(ServiceServlet.class.getName()).log(Level.SEVERE, null, ex);
        }
    }
}
/*

 TEMPLATE SERVICE METHOD - REPLACE ___ PREFIXED NAMES
 private String [___servicename](HttpServletRequest request, HashMap<String, String> paraMap) {        
 for (Object key : paraMap.keySet().toArray()) {
 if (paraMap.get((String) key).isEmpty()) {
 paraMap.remove((String) key);
 }
 }
        
 // ParaMap processing




 // Async setup
 request.setAttribute("org.apache.catalina.ASYNC_SUPPORTED", true);
 AsyncContext asyncCtx = request.startAsync();
 asyncCtx.addListener(new AppAsyncListener());
 asyncCtx.setTimeout(60000);

 ThreadPoolExecutor executor = (ThreadPoolExecutor) request.getServletContext().getAttribute("executor");

 executor.execute(new [___serviceworker](asyncCtx, paraMap));

 return ("/StackV-web/ops/srvc/[___servicejsp]?ret=0");
 }

 */
