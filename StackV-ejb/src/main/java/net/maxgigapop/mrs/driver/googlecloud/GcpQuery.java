
package net.maxgigapop.mrs.driver.googlecloud;

import org.json.simple.JSONObject;
import org.json.simple.JSONArray;
import com.hp.hpl.jena.ontology.OntModel;
import com.hp.hpl.jena.ontology.OntModelSpec;
import com.hp.hpl.jena.query.Query;
import com.hp.hpl.jena.query.QueryExecution;
import com.hp.hpl.jena.query.QueryExecutionFactory;
import com.hp.hpl.jena.query.QueryFactory;
import com.hp.hpl.jena.query.QuerySolution;
import com.hp.hpl.jena.query.ResultSet;
import com.hp.hpl.jena.rdf.model.Model;
import com.hp.hpl.jena.rdf.model.ModelFactory;
import com.hp.hpl.jena.rdf.model.RDFNode;
import java.util.ArrayList;
import java.util.HashMap;

/**
 *
 * @author Adam Smith
 */
public class GcpQuery {
    /*
    This class contains functions used by GoogleCloudPush for querying the addition
    and reduction model. Having these methods in their own class reduces file bloat.
    */
    private final OntModel modelRef, modelAdd, modelReduct;
    private static final OntModel emptyModel = ModelFactory.createOntologyModel(OntModelSpec.OWL_MEM_MICRO_RULE_INF);
    //private static final String defaultRegion = "us-central1";
    //private static final String defaultZone = "us-central1-c";
    private String defaultImage, defaultInstanceType, defaultRegion, defaultZone;
    
    
    public GcpQuery(OntModel modelRef, OntModel modelAdd, OntModel modelReduct, String defaultImage,
            String defaultInstanceType, String defaultRegion, String defaultZone) {
        this.modelRef = modelRef;
        this.modelAdd = modelAdd;
        this.modelReduct = modelReduct;
        this.defaultImage = defaultImage;
        this.defaultInstanceType = defaultInstanceType;
        this.defaultRegion = defaultRegion;
        this.defaultZone = defaultZone;
    }
    
    //need name, zone
    public JSONArray createInstanceRequests() {
        JSONArray output = new JSONArray();
        String method = "createInstanceRequests";
        //need type, vpc, subnet, ip, disk size
        //name, zone, sourceImage, diskType are optional
        //zone, sourceImage, and diskType are derived from type
        String query = "SELECT ?uri ?name ?type \n"
                + "WHERE { ?vpc a nml:Topology ; nml:hasNode ?uri . ?uri a nml:Node \n"
                + "OPTIONAL { ?uri mrs:type ?type } \n"
                + "OPTIONAL { ?uri nml:name ?name } }";
        
        ResultSet r = executeQuery(query, emptyModel, modelAdd);
        while (r.hasNext()) {
            JSONObject instanceRequest = new JSONObject();
            QuerySolution solution = r.next();
            HashMap<String, String> typeInfo = parseTypeStr(getOrDefault(solution, "type", null));
            String instanceUri = solution.get("uri").toString();
            String instanceName = getOrDefault(solution, "name", makeNameFromUri(instanceUri));
            
            //secgroup and keypair are not used by gcp
            //instance+1,image+2,secgroup+3,keypair+4
            
            String machineType = getOrDefault(typeInfo, "instance", defaultInstanceType);
            String sourceImage = getOrDefault(typeInfo, "image", defaultImage);
            String zone = getOrDefault(typeInfo, "zone", defaultZone);
            String diskSize = getOrDefault(typeInfo, "diskSizeGb", "10");
            
            String nicQuery = "SELECT ?nicIP WHERE { BIND(<" + instanceUri + "> AS ?uri) \n"
                    + "?uri nml:hasBidirectionalPort ?nic . \n"
                    + "?nic a nml:BidirectionalPort ; mrs:hasNetworkAddress ?nicAddr . \n"
                    + "?nicAddr a mrs:NetworkAddress ; mrs:value ?nicIP }";
            
            int i = 0;
            
            ResultSet nicResult = executeQuery(nicQuery, emptyModel, modelAdd);
            while (nicResult.hasNext()) {
                String key = "nic" + i++;
                QuerySolution nicSolution = nicResult.next();
                String nicIP = nicSolution.get("nicIP").toString();
                instanceRequest.put(key, nicIP);
            }
            
            instanceRequest.put("type", "create_instance");
            instanceRequest.put("uri", instanceUri);
            instanceRequest.put("name", instanceName);
            instanceRequest.put("machine_type", machineType);
            instanceRequest.put("source_image", sourceImage);
            instanceRequest.put("zone", zone);
            instanceRequest.put("disk_size", diskSize);
            
            //String instanceNIC;
            System.out.printf("CREATE INSTANCE REQUEST: %s\n", instanceRequest);
            //output.add(instanceRequest);
        }
        
        return output;
    }
    
    public ArrayList<JSONObject> deleteInstanceRequests() {
        ArrayList<JSONObject> output = new ArrayList<>();
        String method = "deleteInstanceRequests";
        
        return output;
    }
    
    public ArrayList<JSONObject> createSubnetRequests() {
        ArrayList<JSONObject> output = new ArrayList<>();
        String method = "createSubnetRequests";
        
        //the newlines make debugging these queries much easier.
        //subnet region and name are optional. vpcname is used to build
        String query = "SELECT ?vpcUri ?vpcName ?subnetUri ?subnetName ?subnetCIDR ?subnetRegion\n"
                + "WHERE { ?service mrs:providesVPC ?vpcUri . \n"
                + "?vpcUri a nml:Topology ;\n"
                + "nml:hasService ?switchingService . \n"
                + "?switchingService a mrs:SwitchingService ; \n"
                + "mrs:providesSubnet ?subnetUri . \n"
                + "?subnetUri a mrs:SwitchingSubnet ; mrs:hasNetworkAddress ?addressUri . \n"
                + "?addressUri a mrs:NetworkAddress ; mrs:value ?subnetCIDR \n"
                + "OPTIONAL { ?vpcUri nml:name ?vpcName } \n"
                + "OPTIONAL { ?subnetUri nml:name ?subnetName } \n"
                + "OPTIONAL { ?subnetUri mrs:type ?subnetRegion } }";
        
        ResultSet r = executeQuery(query, emptyModel, modelAdd);
        while (r.hasNext()) {
            JSONObject subnetRequest = new JSONObject();
            QuerySolution solution = r.next();
            String vpcUri = solution.get("vpcUri").toString();
            String vpcName = getOrDefault(solution, "vpcName", makeNameFromUri(vpcUri));
            String subnetUri = getOrDefault(solution, "subnetUri", "error");
            String subnetCIDR = getOrDefault(solution, "subnetCIDR", "error");
            String subnetName = getOrDefault(solution, "subnetName", makeNameFromUri(subnetUri));
            String subnetRegion = getOrDefault(solution, "subnetRegion", defaultRegion);
            
            subnetRequest.put("type", "create_subnet");
            subnetRequest.put("vpc_name", vpcName);
            subnetRequest.put("subnet_uri", subnetUri);
            subnetRequest.put("subnet_cidr", subnetCIDR);
            subnetRequest.put("subnet_name", subnetName);
            subnetRequest.put("subnet_region", subnetRegion);
            //for now, just print
            System.out.printf("CREATE SUBNET REQUEST: %s\n", subnetRequest);
            //output.add(subnetRequest);
        }
        
        return output;
    }
    
    public ArrayList<JSONObject> deleteSubnetRequests() {
        ArrayList<JSONObject> output = new ArrayList<>();
        String method = "deleteSubnetRequests";
        
        return output;
    }
    
    //Need name
    public ArrayList<JSONObject> createVpcRequests() {
        ArrayList<JSONObject> output = new ArrayList<>();
        String method = "createVpcRequests";
        //Find an object that provides a vpc to something else, and is a topology
        //Name is optional. Only URI is mandatory
        String query = "SELECT ?vpcUri ?vpcName"
                + "WHERE { ?service mrs:providesVPC ?vpcUri . ?vpcUri a nml:Topology ;"
                + "OPTIONAL { ?vpcUri nml:name ?vpcName} }";
        
        ResultSet r = executeQuery(query, emptyModel, modelAdd);
        while (r.hasNext()) {
            JSONObject vpcRequest = new JSONObject();
            QuerySolution solution = r.next();
            String vpcUri = solution.get("vpcUri").toString();
            String vpcName = getOrDefault(solution, "vpcName", makeNameFromUri(vpcUri));
            
            vpcRequest.put("type", "create_vpc");
            vpcRequest.put("name", vpcName);
            vpcRequest.put("uri", vpcUri);
            
            //for now, just print
            System.out.printf("CREATE VPC REQUEST: %s\n", vpcRequest);
            //output.add(vpcRequest);
        }
        return output;
    }
    
    public ArrayList<JSONObject> deleteVpcRequests() {
        ArrayList<JSONObject> output = new ArrayList<>();
        String method = "deleteVpcRequests";
        
        return output;
    }
    
    public static String makeNameFromUri(String uri) {
        //given a uri, returns a string that can be used to name a resource.
        //useful when a name for a resource is not available in model
        String output = removeChars(uri);
        return output.substring(output.length() - 60);
    }
    
    //Removes non-alphanumeric non-hyphen characters from strings
    //Similar to makeUriGcpCompatible from gcpModelBuilder, but it removes
    //instead of escaping offending characters.
    public static String removeChars (String input) {
        return input.replaceAll("[^a-zA-Z0-9\\-]", "");
    }
    
    private static String getOrDefault(QuerySolution q, String key, String def) {
        //This checks q for the key value, and returns the default if it is not found
        if (q.contains(key)) {
            return q.get(key).toString();
        } else {
            return def;
        }
    }
    
    private static String getOrDefault(HashMap<String, String> h, String key, String def) {
        //This checks q for the key value, and returns the default if it is not found
        if (h.containsKey(key)) {
            return h.get(key).toString();
        } else {
            return def;
        }
    }
    
    /* ****************************************************************
     * function that executes a query using a model addition/subtraction and a
     * reference model, returns the result of the query
     * ****************************************************************/
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
    
    /**
     * ****************************************************************
     * function that executes a query using a model addition/subtraction and a
     * reference model, returns the result of the query
     * ****************************************************************
     */
    private ResultSet executeQueryUnion(String queryString, OntModel refModel, OntModel model) {
        queryString = "prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n"
                + "prefix owl: <http://www.w3.org/2002/07/owl#>\n"
                + "prefix nml: <http://schemas.ogf.org/nml/2013/03/base#>\n"
                + "prefix mrs: <http://schemas.ogf.org/mrs/2013/12/topology#>\n"
                + queryString;

        Model unionModel = ModelFactory.createUnion(refModel, model);

        //get all the nodes that will be added
        Query query = QueryFactory.create(queryString);
        QueryExecution qexec = QueryExecutionFactory.create(query, unionModel);
        ResultSet r = qexec.execSelect();
        return r;
    }

    private HashMap<String, String> parseTypeStr(String typeStr) {
        HashMap<String, String> output = new HashMap<>();
        if (typeStr == null) return output;
        String key, value, pairs[] = typeStr.split(",");
        int pos;
        
        for (String s : pairs) {
            pos = s.indexOf("+");
            key = s.substring(0, pos);
            value = s.substring(pos+1);
            output.put(key, value);
        }
        
        return output;
    }
}
