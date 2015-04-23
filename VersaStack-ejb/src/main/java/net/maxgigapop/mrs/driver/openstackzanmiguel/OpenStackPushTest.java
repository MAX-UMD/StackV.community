/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package net.maxgigapop.mrs.driver.openstackzanmiguel;

import com.amazonaws.services.ec2.model.Instance;
import com.hp.hpl.jena.ontology.OntModel;
import com.hp.hpl.jena.ontology.OntModelSpec;
import com.hp.hpl.jena.query.Query;
import com.hp.hpl.jena.query.QueryExecution;
import com.hp.hpl.jena.query.QueryExecutionFactory;
import com.hp.hpl.jena.query.QueryFactory;
import com.hp.hpl.jena.query.QuerySolution;
import com.hp.hpl.jena.query.ResultSet;
import com.hp.hpl.jena.rdf.model.ModelFactory;
import com.hp.hpl.jena.rdf.model.RDFNode;
import java.util.ArrayList;
import java.util.List;
import org.json.simple.JSONObject;
import org.openstack4j.api.Builders;
import org.openstack4j.api.OSClient;
import org.openstack4j.model.compute.Server;
import org.openstack4j.model.compute.ServerCreate;
import org.openstack4j.model.compute.builder.ServerCreateBuilder;
import org.openstack4j.model.network.IP;
import org.openstack4j.model.network.*;
import org.openstack4j.model.storage.block.*;
import org.openstack4j.openstack.compute.domain.NovaServer;
import org.openstack4j.openstack.compute.internal.ServerServiceImpl;
import org.openstack4j.openstack.networking.domain.NeutronNetwork;
import org.openstack4j.openstack.networking.domain.NeutronPort;
import org.openstack4j.openstack.networking.domain.NeutronSubnet;
import org.openstack4j.openstack.storage.block.domain.CinderVolume;

/**
 *
 * @author muzcategui
 */
/**
 * **********************************************************
 *
 * TODO 1) figure how routing tables work in OpenStack 2) use the routing tables
 * while doing the network requests addition and deletion 3) finish the network
 * propagate request method 4) figure out how the root devices work in openStack
 * in order to create/delete a volume
 * **********************************************************
 */
public class OpenStackPushTest {

    //global variables
    private OpenStackGet client = null;
    private OSClient osClient = null;
    static final OntModel emptyModel = ModelFactory.createOntologyModel(OntModelSpec.OWL_MEM_MICRO_RULE_INF);
    private String topologyUri;

    /*public static void main(String[] args) {
     OpenStackPushTest test = new OpenStackPushTest();

     }*/
    public OpenStackPushTest(String url, String username, String password, String tenantName, String topologyUri) {
        client = new OpenStackGet(url, username, password, tenantName);
        osClient = client.getClient();

        //do an adjustment to the topologyUri
        this.topologyUri = topologyUri + ":";

        client.getServers().get(0);
        client.getServers();

        
        
    }

    /**
     * ***********************************************
     * Method to get the requests provided in the model addition and model
     * reduction ************************************************
     */
    public List<JSONObject> pushPropagate(OntModel modelRef, OntModel modelAdd, OntModel modelReduct) throws Exception {
        List<JSONObject> requests = new ArrayList();

        //get all the requests
        requests.addAll(volumesAttachmentRequests(modelRef, modelReduct, false));
        requests.addAll(volumesRequests(modelRef, modelReduct, false));
        requests.addAll((portsRequests(modelRef, modelReduct, false)));
        requests.addAll(subnetsRequests(modelRef, modelReduct, false));
        requests.addAll(networksRequests(modelRef, modelAdd));
        requests.addAll(subnetsRequests(modelRef, modelAdd, true));
        requests.addAll(volumesRequests(modelRef, modelAdd, true));
        requests.addAll((portsRequests(modelRef, modelAdd, true)));
        requests.addAll(volumesAttachmentRequests(modelRef, modelAdd, true));
        return requests;
    }

    /**
     * **********************************************************************
     * Function to do execute all the requests provided by the propagate method
     * **********************************************************************
     */
    public void pushCommit(List<JSONObject> requests) {
        for (JSONObject o : requests) {
            if (o.get("request").toString().equals("CreatePortRequest")) {
                Port port = new NeutronPort();
                Subnet net = client.getSubnet(o.get("subnet name").toString());
                port.toBuilder().name(o.get("name").toString())
                        .fixedIp(o.get("private address").toString(), net.getId());

                osClient.networking().port().create(port);
            } else if (o.get("request").toString().equals("DeletePortRequest")) {
                Port port = client.getPort(o.get("port name").toString());
                osClient.networking().port().delete(port.getId());

            } else if (o.get("request").toString().equals("CreateVolumeRequest")) {
                Volume volume = new CinderVolume();
                volume.toBuilder().size(Integer.parseInt(o.get("size").toString()))
                        .volumeType(o.get("type").toString())
                        .name(o.get("name").toString());

                osClient.blockStorage().volumes().create(volume);

            } else if (o.get("request").toString().equals("DeleteVolumeRequest")) {
                Volume volume = client.getVolume(o.get("volume name").toString());
                osClient.blockStorage().volumes().delete(volume.getId());

            } else if (o.get("request").toString().equals("CreateSubnetRequest")) {
                Subnet subnet = new NeutronSubnet();
                subnet.toBuilder().cidr(o.get("cidr block").toString())
                        .network(client.getNetwork(o.get("network name").toString()))
                        .name(o.get("name").toString());

                osClient.networking().subnet().create(subnet);

            } else if (o.get("request").toString().equals("DeleteSubnetRequest")) {
                Subnet net = client.getSubnet(o.get("subnet name").toString());
                osClient.networking().subnet().delete(net.getId());
            } else if (o.get("request").toString().equals("RunInstanceRequest")) {
                ServerCreateBuilder builder = Builders.server()
                        .name("name")
                        .image(o.get("image").toString())
                        .flavor(o.get("flavor").toString());

                int index = 0;
                while (true) {
                    String key = "port" + Integer.toString(index);
                    if (o.containsKey(key)) {
                        builder.addNetworkPort(o.get(key).toString());
                    } else {
                        break;
                    }
                }

                Server server = (Server) builder.build();
                server = osClient.compute().servers().boot((ServerCreate) server);

            } else if (o.get("request").toString().equals("TerminateInstanceRequest")) {
                Server server = client.getServer(o.get("server name").toString());
                osClient.compute().servers().delete(server.getId());
            } else if (o.get("request").toString().equals("AttachVolumeRequest")) {
                ServerServiceImpl serverService = new ServerServiceImpl();
                String volumeId = client.getVolume(o.get("volume name").toString()).getId();
                String serverId = client.getServer(o.get("server name").toString()).getId();

                serverService.attachVolume(serverId, volumeId, o.get("device name").toString());
            } else if (o.get("request").toString().equals("DetachVolumeRequest")) {
                ServerServiceImpl serverService = new ServerServiceImpl();
                String serverId = client.getServer(o.get("server name").toString()).getId();
                String attachmentId = o.get("attachment id").toString();

                serverService.detachVolume(serverId, attachmentId);
            }

        }

    }

    /**
     * *****************************************************************
     * Function to create a Vpc from a modelRef
     * /*****************************************************************
     */
    private List<JSONObject> networksRequests(OntModel modelRef, OntModel model) throws Exception {
        List<JSONObject> requests = new ArrayList();
        String query;

        query = "SELECT ?network WHERE {?service mrs:providesVPC  ?network ."
                + "?network a nml:Topology}";
        ResultSet r = executeQuery(query, emptyModel, model);
        while (r.hasNext()) {
            QuerySolution querySolution = r.next();
            RDFNode network = querySolution.get("network");
            String networkName = network.asResource().toString().replace(topologyUri, "");

            //double check vpc does not exist in the cloud
            Network net = client.getNetwork(networkName);

            if (net != null) // if network  exists, no need to create it
            {
                throw new Exception(String.format("Network %s already exists", network));
            } else {
                String networkId = net.getId();
                query = "SELECT ?cloud WHERE {?cloud nml:hasTopology <" + network.asResource() + ">}";
                ResultSet r1 = executeQuery(query, emptyModel, model);
                if (!r1.hasNext()) {
                    throw new Exception(String.format("model addition does not specify the openStack-cloud that"
                            + "provides network : %s", network));
                }

                query = "SELECT ?address WHERE {<" + network.asResource() + "> mrs:hasNetworkAddress ?address}";
                r1 = executeQuery(query, emptyModel, model);
                if (!r1.hasNext()) {
                    throw new Exception(String.format("model addition does not specify the "
                            + "newtowk address of the network: %s", network));
                }
                QuerySolution querySolution1 = r1.next();
                RDFNode address = querySolution1.get("address");

                query = "SELECT ?type ?value WHERE {<" + address.asResource() + "> mrs:type ?type ."
                        + "<" + address.asResource() + "> mrs:value ?value}";
                r1 = executeQuery(query, modelRef, model);
                if (!r1.hasNext()) {
                    throw new Exception(String.format("model addition does not specify the "
                            + "type or value of network address: %s", address));
                }
                querySolution1 = r1.next();
                RDFNode value = querySolution1.get("value");
                String cidrBlock = value.asLiteral().toString();

                //check taht vpc offers switching and routing Services and vpc services
                query = "SELECT ?service  WHERE {<" + network.asResource() + "> nml:hasService  ?service ."
                        + "?service a  mrs:SwitchingService}";
                r1 = executeQuery(query, emptyModel, model);
                if (!r1.hasNext()) {
                    throw new Exception(String.format("New network %s does not speicfy Switching Service", network));
                }

                query = "SELECT ?service  WHERE {<" + network.asResource() + "> nml:hasService  ?service ."
                        + "?service a mrs:RoutingService}";
                r1 = executeQuery(query, modelRef, model);
                if (!r1.hasNext()) {
                    throw new Exception(String.format("New network %s does not speicfy Routing Service", network));
                }
                querySolution1 = r1.next();
                RDFNode routingService = querySolution1.get("service");

                //incorporate main routing table and routes into the vpc
                query = "SELECT ?routingTable ?type  WHERE {<" + routingService.asResource() + "> mrs:providesRoutingTable ?routingTable ."
                        + "?routingTable mrs:type  \"main\"}";
                r1 = executeQuery(query, modelRef, model);
                if (!r1.hasNext()) {
                    throw new Exception(String.format("Routing service  %s does not speicfy main Routing table in the model addition", routingService));
                }

                querySolution1 = r1.next();
                RDFNode routingTable = querySolution1.get("routingTable");
                String routeTableIdTagValue = routingTable.asResource().toString().replace(topologyUri, "");

                String vpcIp = cidrBlock;
                cidrBlock = "\"" + cidrBlock + "\"";

                //check for  the local route is in the route table 
                query = "SELECT ?route ?to  WHERE {<" + routingTable.asResource() + "> mrs:hasRoute ?route ."
                        + "<" + routingService.asResource() + "> mrs:providesRoute ?route ."
                        + "?route mrs:nextHop \"local\" ."
                        + "?route mrs:routeTo  ?to ."
                        + "?to mrs:value " + cidrBlock + "}";
                r1 = executeQuery(query, modelRef, model);
                if (!r1.hasNext()) {
                    throw new Exception(String.format("Routing service has no route for main table in the model"
                            + " addition", routingService));
                }
//                requests += String.format("CreateVpcRequest %s %s %s \n", vpcIp, vpcIdTagValue, routeTableIdTagValue);
            }
        }
        return requests;
    }

    /**
     * *****************************************************************
     * Function to create a subnets from a modelRef
     * ***************************************************************
     */
    private List<JSONObject> subnetsRequests(OntModel modelRef, OntModel model, boolean creation) throws Exception {
        List<JSONObject> requests = new ArrayList();
        String query;

        query = "SELECT ?subnet WHERE {?subnet a mrs:SwitchingSubnet}";
        ResultSet r = executeQuery(query, emptyModel, model);
        while (r.hasNext()) {
            QuerySolution querySolution = r.next();
            RDFNode subnet = querySolution.get("subnet");
            String subnetName = subnet.asResource().toString().replace(topologyUri, "");
            Subnet s = client.getSubnet(subnetName);

            if (s == null ^ creation) //subnet  exists,does not need to create one
            {
                if (creation == true) {
                    throw new Exception(String.format("Subnet %s already exists", subnet));
                } else {
                    throw new Exception(String.format("Subnet %s does not exist, cannot be deleted", subnet));
                }
            } else {
                String subnetId = s.getId();
                query = "SELECT ?service {?service mrs:providesSubnet <" + subnet.asResource() + ">}";
                ResultSet r1 = executeQuery(query, emptyModel, model);
                if (!r1.hasNext()) {
                    throw new Exception(String.format("No service has subnet %s", subnet));
                }
                QuerySolution querySolution1 = r1.next();
                RDFNode service = querySolution1.get("service");
                query = "SELECT ?network {?network nml:hasService <" + service.asResource() + "> ."
                        + "<" + service.asResource() + "> a mrs:SwitchingService}";
                r1 = executeQuery(query, modelRef, model);
                if (!r1.hasNext()) {
                    r1 = executeQuery(query, modelRef, modelRef);
                }
                if (!r1.hasNext()) {
                    throw new Exception(String.format("Subnet %s does not belong a network", subnet));
                }
                querySolution1 = r1.next();
                RDFNode network = querySolution1.get("network");
                String networkName = network.asResource().toString().replace(topologyUri, "");

                query = "SELECT ?subnet ?address ?value WHERE {?subnet mrs:hasNetworkAddress ?address ."
                        + "?address a mrs:NetworkAddress ."
                        + "?address mrs:type \"ipv4-prefix\" ."
                        + "?address mrs:value ?value}";
                r1 = executeQuery(query, modelRef, model);
                querySolution1 = r1.next();
                RDFNode value = querySolution1.get("value");
                String cidrBlock = value.asLiteral().toString();

                JSONObject o = new JSONObject();
                if (creation == true) {
                    o.put("request", "CreateSubnetRequest");
                } else {
                    o.put("network name", networkName);
                }
                o.put("cidr block", cidrBlock);
                o.put("name", subnetName);
                requests.add(o);
            }
        }
        return requests;
    }

    /**
     * *****************************************************************
     * Function to create/delete a volumes from a modelRef
     * ***************************************************************
     */
    private List<JSONObject> volumesRequests(OntModel modelRef, OntModel model, boolean creation) throws Exception {
        List<JSONObject> requests = new ArrayList();
        String query;

        query = "SELECT ?volume WHERE {?volume a mrs:Volume}";
        ResultSet r = executeQuery(query, emptyModel, model);
        while (r.hasNext()) {
            QuerySolution querySolution = r.next();
            RDFNode volume = querySolution.get("volume");
            String volumeName = volume.asResource().toString().replace(topologyUri, "");

            Volume v = client.getVolume(volumeName);

            if (v == null ^ creation) //volume exists, no need to create a volume
            {
                if (creation == true) {
                    throw new Exception(String.format("Volume %s already exists", v));
                } else {
                    throw new Exception(String.format("Volume %s does not exist, cannot be deleted", v));
                }
            } else {
                //check what service is providing the volume
                query = "SELECT ?type WHERE {?service mrs:providesVolume <" + volume.asResource() + ">}";
                ResultSet r1 = executeQuery(query, modelRef, model);
                if (!r1.hasNext()) {
                    throw new Exception(String.format("model addition does not specify service that provides volume: %s", volume));
                }

                //find out the type of the volume
                query = "SELECT ?type WHERE {<" + volume.asResource() + "> mrs:value ?type}";
                r1 = executeQuery(query, modelRef, model);
                if (!r1.hasNext()) {
                    throw new Exception(String.format("model addition does not specify new type of volume: %s", volume));
                }
                QuerySolution querySolution1 = r1.next();
                RDFNode type = querySolution1.get("type");

                //find out the size of the volume
                query = "SELECT ?size WHERE {<" + volume.asResource() + "> mrs:disk_gb ?size}";
                r1 = executeQuery(query, modelRef, model);
                if (!r1.hasNext()) {
                    throw new Exception(String.format("model addition does not specify new size of volume: %s", volume));
                }
                querySolution1 = r1.next();
                RDFNode size = querySolution1.get("size");

                JSONObject o = new JSONObject();
                if (creation == true) {
                    o.put("request", "CreateVolumeRequest");
                } else {
                    o.put("request", "DeleteVolumeRequest");
                }
                o.put("type", type.asLiteral().toString());
                o.put("size", size.asLiteral().toString());
                o.put("availabilty zone", "nova");
                o.put("name", volumeName);
                requests.add(o);

            }
        }
        return requests;
    }

    /**
     * ****************************************************************
     * Function to create network interfaces from a model
     * ****************************************************************
     */
    private List<JSONObject> portsRequests(OntModel modelRef, OntModel modelDelta, boolean creation) throws Exception {
        List<JSONObject> requests = new ArrayList();
        String query;

        //get the tag resource from the reference model that indicates 
        //that this is a network  interface 
        query = "SELECT ?tag WHERE {?tag mrs:type \"interface\" ."
                + "?tag mrs:value \"network\"}";
        ResultSet r = executeQuery(query, modelRef, emptyModel);
        if (!r.hasNext()) {
            throw new Exception(String.format("Reference model has no tags for network"
                    + "interfaces"));
        }
        QuerySolution q = r.next();
        RDFNode tag = q.get("tag");

        query = "SELECT ?port WHERE {?port a  nml:BidirectionalPort ."
                + "?port  mrs:hasTag <" + tag.asResource() + ">}";
        r = executeQuery(query, emptyModel, modelDelta);
        while (r.hasNext()) {
            QuerySolution querySolution = r.next();
            RDFNode port = querySolution.get("port");
            String portName = port.asResource().toString().replace(topologyUri, "");

            Port p = client.getPort(portName);

            if (p == null ^ creation) //network interface  exists, no need to create a network interface
            {
                if (creation == true) {
                    throw new Exception(String.format("Network interface %s already exists", portName));
                } else {
                    throw new Exception(String.format("Network interface %s does not exist, cannot be deleted", portName));
                }
            } else {
                //to get the private ip of the network interface
                query = "SELECT ?address ?value WHERE {<" + port.asResource() + ">  mrs:hasNetworkAddress  ?address ."
                        + "?address mrs:type \"ipv4:private\" ."
                        + "?address mrs:value ?value }";
                ResultSet r1 = executeQuery(query, emptyModel, modelDelta);
                if (!r1.hasNext()) {
                    throw new Exception(String.format("Delta Model does not specify privat ip address of port: %s", port));
                }
                QuerySolution querySolution1 = r1.next();
                RDFNode value = querySolution1.get("value");
                String privateAddress = value.asLiteral().toString();

                //find the subnet that has the port previously found
                query = "SELECT ?subnet WHERE {?subnet  nml:hasBidirectionalPort <" + port.asResource() + ">}";
                r1 = executeQuery(query, modelRef, modelDelta);
                if (!r1.hasNext()) {
                    throw new Exception(String.format("Delta model does not specify network interface subnet of port: %s", port));
                }
                String subnetName = "";
                while (r1.hasNext()) {
                    querySolution1 = r1.next();
                    RDFNode subnet = querySolution1.get("subnet");
                    query = "SELECT ?subnet WHERE {<" + subnet.asResource() + ">  a  mrs:SwitchingSubnet}";
                    ResultSet r3 = executeQuery(query, modelRef, modelDelta);
                    if (r3.hasNext()) //search in the model to see if subnet existed before
                    {
                        subnetName = subnet.asResource().toString().replace(topologyUri, "");
                    } else {
                        throw new Exception(String.format("Subnet  for port %s"
                                + "is not found in any model", port.asResource()));
                    }
                }

                JSONObject o = new JSONObject();
                if (creation == true) {
                    o.put("request", "CreateNetworkInterfaceRequest");
                } else {
                    o.put("request", "DeleteNetworkInterfaceRequest");
                }

                o.put("private address", privateAddress);
                o.put("subnet name", subnetName);
                o.put("port name", portName);
                requests.add(o);
            }
        }
        return requests;
    }
    
    /**
     * ****************************************************************
     * Function to attach (if not on server creation) or detach a port from a server
     * ****************************************************************
     */
    /*private List<JSONObject> portsAttachmentRequests(OntModel modelRef, OntModel modelDelta, boolean creation) throws Exception
    {
        List<JSONObject> requests = new ArrayList();
        String query;
        
        query = "SELECT ?node ?port WHERE {?node nml:hasBidirectionalPort ?port}";
        ResultSet r = executeQuery(query, emptyModel, modelDelta);
        while (r.hasNext()) {
            QuerySolution q = r.next();
            RDFNode port = q.get("port");
            RDFNode server = q.get("node");
            String serverName = server.asResource().toString().replace(topologyUri, "");
            query = "SELECT ?node WHERE {<" + server.asResource() + "> a nml:Node}";
            ResultSet r1 = executeQuery(query, modelRef, emptyModel);
            Server s = null;
            int index = 0;
            if (r1.hasNext()) {
                s = client.getServer(serverName);
                index = client.getServerPorts(s);
            }
            while (r1.hasNext()) {
                r1.next();
                String portIdTag = port.asResource().toString().replace(topologyUri, "");

                query = "SELECT ?tag WHERE {<" + port.asResource() + "> mrs:hasTag ?tag}";
                ResultSet r2 = executeQuery(query, model, modelAdd);
                if (!r2.hasNext()) {
                    throw new Exception(String.format("bidirectional port %s to be attached to intsnace does not specify a tag", port));
                }
                QuerySolution q2 = r2.next();
                RDFNode tag = q2.get("tag");
                query = "SELECT ?tag WHERE {<" + tag.asResource() + "> mrs:type \"interface\". "
                        + "<" + tag.asResource() + "> mrs:value \"network\"}";
                r2 = executeQuery(query, model, emptyModel);
                if (!r2.hasNext()) {
                    throw new Exception(String.format("bidirectional port %s to be attached to instance is not a net"
                            + "work interface", port));
                }

                //see if the network interface is already atatched
                NetworkInterface eni = ec2Client.getNetworkInterface(getResourceId(portIdTag));
                if (eni != null) {
                    if (eni.getAttachment() != null) {
                        throw new Exception(String.format("bidirectional port %s to be attached to instance is already"
                                + " attached to an instance", port));
                    }
                }
                requests += String.format("AttachNetworkInterfaceRequests %s %s %s \n", portIdTag, serverName, Integer.toString(index));
                index++;
            }

        }
        return requests;
    }*/

    /**
     * ****************************************************************
     * Function to request or delete an instance
     * ****************************************************************
     */
    private List<JSONObject> serverRequests(OntModel modelRef, OntModel modelDelta, boolean creation) throws Exception {
        List<JSONObject> requests = new ArrayList();
        String query;

        query = "SELECT ?server WHERE {?server a nml:Node}";
        ResultSet r = executeQuery(query, emptyModel, modelDelta);
        while (r.hasNext()) {
            QuerySolution q = r.next();
            RDFNode vm = q.get("server");
            String serverName = vm.asResource().toString().replace(topologyUri, "");
            Server server = client.getServer(serverName);

            if (server == null ^ creation) //check if server needs to be created or deleted
            {
                if (creation == true) {
                    throw new Exception(String.format("Server %s already exists", serverName));
                } else {
                    throw new Exception(String.format("Server %s does not exist, cannot be deleted", serverName));
                }
            } else {
                //check what service is providing the instance
                query = "SELECT ?service WHERE {?service mrs:providesVM <" + vm.asResource() + ">}";
                ResultSet r1 = executeQuery(query, emptyModel, modelDelta);
                if (!r1.hasNext()) {
                    throw new Exception(String.format("Dleta model does not specify service that provides the VM: %s", vm));
                }
                QuerySolution q1 = r1.next();
                RDFNode hypervisorService = q1.get("service");
                String hyperVisorServiceName = hypervisorService.asResource().toString().replace(topologyUri, "");

                //find the host of the VM
                query = "SELECT ?node WHERE {?node nml:hasService <" + hypervisorService.asResource() + ">}";
                r1 = executeQuery(query, modelRef, modelDelta);
                if (!r1.hasNext()) {
                    throw new Exception(String.format("Delta model does not specify host that provides service %s", hypervisorService));
                }
                q1 = r1.next();
                RDFNode host = q1.get("host");
                String hostName = host.asResource().toString().replace(topologyUri, "");

                //make sure that the host is a server
                query = "SELECT ?node WHERE {<" + host.asResource() + "> a nml:Node}";
                r1 = executeQuery(query, modelRef, modelDelta);
                if (!r1.hasNext()) {
                    throw new Exception(String.format("Host %s to host node %s is not of type nml:Node", host, vm));
                }

                //find the network that the server will be in
                query = "SELECT ?network WHERE {?network nml:hasNode <" + host.asResource() + ">}";
                r1 = executeQuery(query, modelRef, modelDelta);
                if (!r1.hasNext()) {
                    throw new Exception(String.format("VM %s does not specify network", vm));
                }
                q1 = r1.next();
                RDFNode network = q1.get("network");
                String networkName = network.asResource().toString().replace(topologyUri, "");

                //to find the subnet the server is in first  find the port the server uses
                query = "SELECT ?port WHERE {<" + vm.asResource() + "> nml:hasBidirectionalPort ?port}";
                ResultSet r2 = executeQuery(query, modelRef, modelDelta);
                if (!r2.hasNext()) {
                    throw new Exception(String.format("Vm %s does not specify the attached network interface", vm));
                }
                List<String> portNames = new ArrayList();
                while (r2.hasNext())//there could be multiple network interfaces attached to the instance
                {
                    QuerySolution q2 = r2.next();
                    RDFNode port = q2.get("port");
                    String name = port.asResource().toString().replace(topologyUri, "");
                    portNames.add(name);
                }

                //find the EBS volumes that the instance uses
                query = "SELECT ?volume WHERE {<" + vm.asResource() + ">  mrs:hasVolume  ?volume}";
                ResultSet r4 = executeQuery(query, emptyModel, modelDelta);
                if (!r4.hasNext()) {
                    throw new Exception(String.format("Delta model does not specify the volume of the new vm: %s", vm));
                }
                List<String> volumeNames = new ArrayList();
                while (r4.hasNext())//there could be multiple volumes attached to the instance
                {
                    QuerySolution q4 = r4.next();
                    RDFNode volume = q4.get("volume");
                    String name = volume.asResource().toString().replace(topologyUri, "");
                    volumeNames.add(name);
                }

                //put the root device of the instance
                query = "SELECT ?volume ?deviceName ?size ?type  WHERE {"
                        + "<" + vm.asResource() + ">  mrs:hasVolume  ?volume ."
                        + "?volume mrs:target_device ?deviceName ."
                        + "?volume mrs:disk_gb ?size ."
                        + "?volume mrs:value ?type}";
                r4 = executeQuery(query, modelRef, modelDelta);
                boolean hasRootVolume = false;
                String volumeName = "";
                while (r4.hasNext()) {
                    QuerySolution q4 = r4.next();
                    RDFNode volume = q4.get("volume");
                    volumeName = volume.asResource().toString().replace(topologyUri, "");
                    String deviceName = q4.get("deviceName").asLiteral().toString();
                    if (deviceName.equals("/dev/")) {
                        hasRootVolume = true;
                    }
                }
                if (hasRootVolume == false) {
                    throw new Exception(String.format("model addition does not specify root volume for node: %s", vm));
                }

                JSONObject o = new JSONObject();
                if (creation == true) {
                    o.put("request", "RunInstanceRequest");
                } else {
                    o.put("request", "TerminateInstanceRequest");
                }

                o.put("server name", serverName);
                o.put("image", "54f6673b-f39f-461b-886e-dbe4f4497fd5");
                o.put("flavor", volumeName);

                int index = 0;
                for (String port : portNames) {
                    String key = "port" + Integer.toString(index);
                    o.put(key, port);
                    index++; //increment the device index
                }
                requests.add(o);
            }
        }
        return requests;
    }

    /**
     * ****************************************************************
     * Function to attach or detach volume to an instance
     * ****************************************************************
     */
    private List<JSONObject> volumesAttachmentRequests(OntModel modelRef, OntModel modelDelta, boolean creation) throws Exception {
        List<JSONObject> requests = new ArrayList();
        String query;

        //check if the volume is new therefore it should be in the model additiom
        query = "SELECT  ?node ?volume  WHERE {?node  mrs:hasVolume  ?volume}";

        ResultSet r1 = executeQuery(query, emptyModel, modelDelta);
        while (r1.hasNext()) {
            QuerySolution querySolution1 = r1.next();
            RDFNode server = querySolution1.get("node");
            String serverName = server.asResource().toString().replace(topologyUri, "");
            RDFNode volume = querySolution1.get("volume");
            String volumeName = volume.asResource().toString().replace(topologyUri, "");

            query = "SELECT ?deviceName WHERE{<" + volume.asResource() + "> mrs:target_device ?deviceName}";
            ResultSet r2 = executeQuery(query, modelRef, modelDelta);
            if (!r2.hasNext()) {
                throw new Exception(String.format("volume device name is not specified for volume %s in the model delta", volume));
            }

            QuerySolution querySolution2 = r2.next();

            RDFNode deviceName = querySolution2.get("deviceName");
            String device = deviceName.asLiteral().toString();

            if (!device.equals("/dev/")) {
                Server s = client.getServer(serverName);

                Volume vol = client.getVolume(volumeName);
                if (vol == null) {
                    query = "SELECT ?deviceName ?size ?type WHERE{<" + volume.asResource() + "> mrs:target_device ?deviceName}";
                    r2 = executeQuery(query, modelRef, modelDelta);
                    if (!r2.hasNext()) {
                        throw new Exception(String.format("volume %s is not well specified in volume delta", volume));
                    }
                }
                if (s != null) {
                    List<String> map = s.getOsExtendedVolumesAttached();
                    if (vol == null) {
                        if (creation == false) {
                            throw new Exception(String.format("volume %s to be detached does not exist", volumeName));
                        } else {
                            JSONObject o = new JSONObject();
                            o.put("request", "AttachVolumeRequest");
                            o.put("server name", serverName);
                            o.put("volume name", volumeName);
                            o.put("device name", device);
                            requests.add(o);
                        }
                    } else {
                        if (creation == true) {
                            if (!map.contains(vol.getId())) {
                                JSONObject o = new JSONObject();
                                o.put("request", "AttachVolumeRequest");
                                o.put("server name", serverName);
                                o.put("volume name", volumeName);
                                o.put("device name", device);
                                requests.add(o);
                            } else {
                                throw new Exception(String.format("volume %s is already attached to"
                                        + " server %s", volumeName, serverName));
                            }
                        } else if (creation == false) {
                            if (map.contains(vol.getId())) {
                                JSONObject o = new JSONObject();
                                o.put("request", "DetachVolumeRequest");
                                o.put("server name", serverName);
                                List<? extends VolumeAttachment> att = vol.getAttachments();
                                for(VolumeAttachment a: att)
                                {
                                    if (a.getId().equals(s.getId()))
                                        o.put("attachment id", a.getId());
                                }
                                s.getOsExtendedVolumesAttached();
                                requests.add(o);
                            } else {
                                throw new Exception(String.format("volume %s is not attached to"
                                        + " server %s", volumeName, serverName));
                            }
                        }
                    }

                } else if (s == null) {
                    if (creation == true) {
                        JSONObject o = new JSONObject();
                        o.put("request", "AttachVolumeRequest");
                        o.put("server name", serverName);
                        o.put("volume name", volumeName);
                        o.put("device name", device);
                        requests.add(o);
                    } else {
                        throw new Exception(String.format("server %s where the volume %s will be"
                                + "detached does not exists", serverName, volumeName));
                    }
                }
            }
        }
        return requests;
    }

    /**
     * ****************************************************************
     * function that executes a query using a model addition/subtraction and a
     * reference model, returns the result of the query
     * ****************************************************************
     */
    private ResultSet executeQuery(String queryString, OntModel refModel, OntModel model) {
        queryString = "prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n"
                + "prefix owl: <http://www.w3.org/2002/07/owl#>\n"
                + "prefix nml: <http://schemas.ogf.org/nml/2013/03/base#>\n"
                + "prefix mrs: <http://schemas.ogf.org/mrs/2013/12/topology#>\n"
                + queryString;

        //get all the nodes that will be added
        Query query = QueryFactory.create(queryString);
        QueryExecution qexec = QueryExecutionFactory.create(query, model);
        ResultSet r = qexec.execSelect();

        //check on reference model if the statement is not in the model addition,
        //or model subtraction
        if (!r.hasNext()) {
            qexec = QueryExecutionFactory.create(query, refModel);
            r = qexec.execSelect();
        }
        return r;
    }

}