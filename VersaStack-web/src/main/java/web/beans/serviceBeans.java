package web.beans;

import java.io.BufferedReader;
import java.io.DataOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.UnsupportedEncodingException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.logging.Level;
import java.util.logging.Logger;

public class serviceBeans {

    private static final Logger logger = Logger.getLogger(serviceBeans.class.getName());
    String login_db_user = "root";
    String login_db_pass = "takehaya";
    String front_db_user = "root";
    String front_db_pass = "takehaya";
    String host = "http://localhost:8080/VersaStack-web/restapi/";

    public serviceBeans() {

    }
    
    // TODO::   Implement skeleton, replace this with pre-condition/post-condition
    //          documentation.
    public int driverInstall(String driverID) {
        String driver = "";
        if(driverID.equalsIgnoreCase("stubdriver")){
            driver =  "<driverInstance><properties><entry><key>topologyUri</key>"
                    + "<value>urn:ogf:network:rains.maxgigapop.net:2013:topology</value>"
                    + "</entry><entry><key>driverEjbPath</key>"
                    + "<value>java:module/StubSystemDriver</value></entry>"
                    + "<entry><key>stubModelTtl</key>"
                    + "<value>@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.\n"
                    + "@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.\n"
                    + "@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.\n"
                    + "@prefix owl: <http://www.w3.org/2002/07/owl#>.\n"
                    + "@prefix nml: <http://schemas.ogf.org/nml/2013/03/base#>.\n"
                    + "@prefix mrs: <http://schemas.ogf.org/mrs/2013/12/topology#>.\n"
                    + "<http://www.maxgigapop.net/mrs/2013/topology#> a owl:Ontology;\n"
                    + "    rdfs:label \"NML-MRS Description of the MAX Research Infrastructure\".\n"
                    + "<urn:ogf:network:rains.maxgigapop.net:2013:topology>\n"
                    + "    a   nml:Topology,\n"
                    + "        owl:NamedIndividual;\n"
                    + "    nml:hasNode\n"
                    + "        <urn:ogf:network:rains.maxgigapop.net:2013:clpk-msx-1>,\n"
                    + "        <urn:ogf:network:rains.maxgigapop.net:2013:clpk-msx-4>."
                    + "</value></entry></properties></driverInstance>";
            
        }else if(driverID.equalsIgnoreCase("awsdriver")){
            driver =  "<driverInstance><properties><entry><key>topologyUri</key>"
                    + "<value>urn:ogf:network:aws.amazon.com:aws-cloud</value></entry>"
                    + "<entry><key>driverEjbPath</key><value>java:module/AwsDriver</value></entry>"
                    + "<entry><key>aws_access_key_id</key><value>AKIAJQMR4G7PCMWZRIHA</value></entry>"
                    + "<entry><key>aws_secret_access_key</key><value>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</value></entry>"
                    + "<entry><key>region</key><value>us-east-1</value></entry></properties></driverInstance>";
        }else if(driverID.equalsIgnoreCase("versaNSDriver")){
            driver =  "<driverInstance><properties><entry><key>topologyUri</key>"
                    + "<value>urn:ogf:network:sdn.maxgigapop.net:network</value></entry>"
                    + "<entry><key>driverEjbPath</key><value>java:module/GenericRESTDriver</value></entry>"
                    + "<entry><key>subsystemBaseUrl</key><value>http://localhost:8080/VersaNS-0.0.1-SNAPSHOT</value></entry>"
                    + "</properties></driverInstance>";
        }else if(driverID.equalsIgnoreCase("openStackDriver")){
            
        }else
            //invalid driverID
            return 1;
        try{
            URL url = new URL(String.format("%s/driver", host));
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            String result = this.executeHttpMethod(url, connection, "POST", driver);
            if(!result.equalsIgnoreCase("plug successfully"))
                //plugin error
                return 2;
        }catch(Exception e){
                //connection error
                return 3;
        }
        
        return 0;
    }
    
    public int driverUninstall(String driverID){
        String topoUri = "";
        if(driverID.equalsIgnoreCase("stubdriver"))
            topoUri = "urn:ogf:network:rains.maxgigapop.net:2013:topology";
        else if(driverID.equalsIgnoreCase("awsdriver"))
            topoUri = "urn:ogf:network:aws.amazon.com:aws-cloud";
        else if(driverID.equalsIgnoreCase("versaNSDriver"))
            topoUri = "";
        else if(driverID.equalsIgnoreCase("openStackDriver"))
            topoUri = "";
        else
            //invalid driverID
            return 1;
                
        try{
            URL url = new URL(String.format("%s/driver/%s", host, topoUri));
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            String result = this.executeHttpMethod(url, connection, "DELETE", null);
            if(!result.equalsIgnoreCase("unplug successfully"))
                //unplug error
                return 2;
        }catch(Exception e){
                //connection error
                return 3;
        }        
        return 0;
    }

    // Utility Functions
    private static String shaEnc(String pass, String salt) throws UnsupportedEncodingException, NoSuchAlgorithmException {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        String salted_password = pass + salt;

        md.update(salted_password.getBytes("UTF-8"));
        byte[] digest = md.digest();

        String digest_str = "";
        for (byte by : digest) {
            digest_str += by;
        }

        return digest_str;
    }
    
        private String executeHttpMethod(URL url, HttpURLConnection conn, String method, String body) throws IOException {
        conn.setRequestMethod(method);
        conn.setRequestProperty("Content-type", "application/xml");
        conn.setRequestProperty("Accept", "application/json");
        if (body != null && !body.isEmpty()) {
            conn.setDoOutput(true);
            try (DataOutputStream wr = new DataOutputStream(conn.getOutputStream())) {
                wr.writeBytes(body);
                wr.flush();
            }
        }
        logger.log(Level.INFO, "Sending {0} request to URL : {1}", new Object[]{method, url});
        int responseCode = conn.getResponseCode();
        logger.log(Level.INFO, "Response Code : {0}", responseCode);

        
        StringBuilder responseStr;
        try (BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()))) {
            String inputLine;
            responseStr = new StringBuilder();
            while ((inputLine = in.readLine()) != null) {
                responseStr.append(inputLine);
            }
        }
        return responseStr.toString();
    }

}
