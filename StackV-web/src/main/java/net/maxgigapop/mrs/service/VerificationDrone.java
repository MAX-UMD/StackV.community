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
package net.maxgigapop.mrs.service;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import net.maxgigapop.mrs.common.StackLogger;
import net.maxgigapop.mrs.common.TokenHandler;
import net.maxgigapop.mrs.rest.api.WebResource;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;

/**
 *
 * @author rikenavadur
 */
public class VerificationDrone implements Runnable {

    private final static String host = "http://127.0.0.1:8080/StackV-web/restapi";
    private final StackLogger logger = new StackLogger("net.maxgigapop.mrs.rest.api.WebResource", "VerificationDrone");
    private final TokenHandler token;
    Connection conn;
    PreparedStatement prep;
    ResultSet rs;

    String state;
    String instanceUUID;
    String pending;
    int runs;
    int delay;
    int currentRun;

    /*String deltaUUID;
    String verifiedReduction;
    String verifiedAddition;
    String unverifiedReduction;
    String unverifiedAddition;
    String reduction;
    String addition;*/
    public VerificationDrone(String _instanceUUID, TokenHandler _token, Connection _conn, int _runs, int _delay) {
        instanceUUID = _instanceUUID;
        token = _token;
        conn = _conn;
        runs = _runs;
        delay = _delay;

        logger.refuuid(instanceUUID);

        /*try {
            prep = conn.prepareStatement("SELECT * FROM service_verification"
                    + "WHERE instanceUUID = ?");
            prep.setString(1, instanceUUID);
            ResultSet rs1 = prep.executeQuery();
            if (rs1.next()) {
                state = rs1.getString("state");
                currentRun = rs1.getInt("verification_run");
                deltaUUID = rs1.getString("delta_uuid");
                verifiedReduction = rs1.getString("verified_reduction");
                verifiedAddition = rs1.getString("verified_addition");
                unverifiedReduction = rs1.getString("unverified_reduction");
                unverifiedAddition = rs1.getString("unverified_addition");
                reduction = rs1.getString("reduction");
                addition = rs1.getString("addition");
            }
        } catch (SQLException ex) {
            logger.catching("VerificationDrone init", ex);
        }*/
    }

    @Override
    public void run() {
        // Double check for INIT state.
        initData();
        switch (state) {
            case "FINISHED":
                resetVerification();
                verify();
                break;
            case "INIT":
            case "PAUSED":
                verify();
                break;
            case "RUNNING":
                logger.status("run", "Verification attempted to start, but already started");            
        }
        WebResource.commonsClose(conn, prep, rs);
    }

    private void verify() {
        String method = "verify";
        logger.start("Verification drone starting");
        state = "RUNNING";
        currentRun++;
        try {
            while (currentRun <= runs) {
                // Step 1: Check for pending actions
                updateActions();
                if (!pending.isEmpty()) {
                    switch (pending) {
                        case "PAUSE":
                            logger.trace(method, "Pause signal received. Drone ending operation");
                            return;
                        case "STOP":
                            logger.trace(method, "Stop signal received. Drone ending operation");
                            return;
                    }
                }
                
                logger.trace(method, "Run: " + currentRun);
                
                // Step 2: Update state
                boolean redVerified = true, addVerified = true;

                URL url = new URL(String.format("%s/service/verify/%s", host, instanceUUID));
                HttpURLConnection urlConn = (HttpURLConnection) url.openConnection();
                String result = WebResource.executeHttpMethod(url, urlConn, "GET", null, token.auth());

                // Pull data from JSON.
                JSONParser parser = new JSONParser();
                Object obj = parser.parse(result);
                JSONObject verifyJSON = (JSONObject) obj;

                if (verifyJSON.containsKey("reductionVerified") && (verifyJSON.get("reductionVerified") != null)
                        && ((String) verifyJSON.get("reductionVerified")).equals("false")) {
                    redVerified = false;
                }
                if (verifyJSON.containsKey("additionVerified") && (verifyJSON.get("additionVerified") != null)
                        && ((String) verifyJSON.get("additionVerified")).equals("false")) {
                    addVerified = false;
                }

                // Step 3: Update verification data
                prep = conn.prepareStatement("UPDATE `service_verification` SET `state`=?,`delta_uuid`=?,`creation_time`=?,`verified_reduction`=?,`verified_addition`=?,"
                        + "`unverified_reduction`=?,`unverified_addition`=?,`reduction`=?,`addition`=?, `verification_run`=? "
                        + "WHERE `instanceUUID`= ? ");
                prep.setString(1, (String) verifyJSON.get("referenceUUID"));
                prep.setString(2, (String) verifyJSON.get("creationTime"));
                prep.setString(3, (String) verifyJSON.get("verifiedModelReduction"));
                prep.setString(4, (String) verifyJSON.get("verifiedModelAddition"));
                prep.setString(5, (String) verifyJSON.get("unverifiedModelReduction"));
                prep.setString(6, (String) verifyJSON.get("unverifiedModelAddition"));
                prep.setString(7, (String) verifyJSON.get("reductionVerified"));
                prep.setString(8, (String) verifyJSON.get("additionVerified"));
                prep.setInt(9, currentRun);
                prep.setString(10, instanceUUID);
                prep.executeUpdate();

                // Step 4: Check for success
                if (redVerified && addVerified) {
                    state = "FINISHED";
                    prep = conn.prepareStatement("UPDATE `frontend`.`service_verification` SET `verification_state` = '1', `state` = 'FINISHED' "
                            + "WHERE `instanceUUID` = ? ");
                    prep.setString(1, instanceUUID);
                    prep.executeUpdate();

                    logger.end(method, "Verification success");
                    return;
                }

                // Step 5: Delay until next run
                Thread.sleep(delay * 1000);
                currentRun++;

            }

            // Step 4.1 If hit max runs without success, verification has failed
            state = "FINISHED";
            prep = conn.prepareStatement("UPDATE `frontend`.`service_verification` SET `verification_state` = '-1', `state` = 'FINISHED' "
                    + "WHERE `instanceUUID` = ? ");
            prep.setString(1, instanceUUID);
            prep.executeUpdate();

            logger.end(method, "Verification failed");
        } catch (IOException | ParseException | SQLException | InterruptedException ex) {
            logger.catching(method, ex);
        }
    }

    // UTILITY
    private void initData() {
        try {
            prep = conn.prepareStatement("SELECT state, verification_run FROM service_verification"
                    + "WHERE instanceUUID = ?");
            prep.setString(1, instanceUUID);
            rs = prep.executeQuery();
            if (rs.next()) {
                state = rs.getString("state");
                currentRun = rs.getInt("verification_run");
                logger.trace("initData", "Drone initialized");
            }
        } catch (SQLException ex) {
            logger.catching("initData", ex);
        }
    }

    private void updateActions() {
        try {
            prep = conn.prepareStatement("SELECT pending_action FROM service_verification"
                    + "WHERE instanceUUID = ?");
            prep.setString(1, instanceUUID);
            rs = prep.executeQuery();
            if (rs.next()) {
                pending = rs.getString("pending_action");
            }
        } catch (SQLException ex) {
            logger.catching("updateData", ex);
        }
    }

    private void resetVerification() {
        try {
            int instanceID = -1;
            prep = conn.prepareStatement("SELECT service_instance_id FROM service_verification"
                    + "WHERE instanceUUID = ?");
            prep.setString(1, instanceUUID);
            rs = prep.executeQuery();
            if (rs.next()) {
                instanceID = rs.getInt("service_instance_id");
            }

            prep = conn.prepareStatement("DELETE FROM service_verification WHERE instanceUUID = ?");
            prep.setString(1, instanceUUID);
            prep.executeUpdate();

            prep = conn.prepareStatement("INSERT INTO `frontend`.`service_verification` "
                    + "(`service_instance_id`, `instanceUUID`, `state`) VALUES (?,?,'INIT')");
            prep.setInt(1, instanceID);
            prep.setString(2, instanceUUID);
            prep.executeUpdate();
        } catch (SQLException ex) {
            logger.catching("resetVerification", ex);
        }
    }
}