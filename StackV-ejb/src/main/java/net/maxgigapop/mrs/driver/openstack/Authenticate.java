/*
 * Copyright (c) 2013-2016 University of Maryland
 * Created by: Zan Wang 2015
 * Modified by: Xi Yang 2015-2016

 * Permission is hereby granted, free of charge, to any person obtaining a copy 
 * of this software and/or hardware specification (the “Work”) to deal in the 
 * Work without restriction, including without limitation the rights to use, 
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of 
 * the Work, and to permit persons to whom the Work is furnished to do so, 
 * subject to the following conditions:

 * The above copyright notice and this permission notice shall be included in 
 * all copies or substantial portions of the Work.

 * THE WORK IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL 
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE WORK OR THE USE OR OTHER DEALINGS  
 * IN THE WORK.
 */
package net.maxgigapop.mrs.driver.openstack;

import org.openstack4j.api.OSClient;
import org.openstack4j.core.transport.Config;
import org.openstack4j.openstack.OSFactory;

/**
 *
 * @author max
 */
public class Authenticate {

    public OSClient openStackAuthenticate(String url, String NATServer, String username, String password, String tenantName) {

        //define OS Client
        OSClient client = null;

        // If the OpenStack controller  is behind NAT, it needs to be specified
        //to authenticate 
        if (NATServer == null || NATServer.isEmpty()) {
            client = OSFactory.builder()
                    .endpoint(url)
                    .credentials(username, password)
                    .tenantName(tenantName)
                    .withConfig(Config.DEFAULT)
                    .authenticate();

        } else {
            client = OSFactory.builder()
                    .endpoint(url)
                    .credentials(username, password)
                    .tenantName(tenantName)
                    .withConfig(Config.newConfig().withEndpointNATResolution(NATServer))
                    .authenticate();
        }

        return client;
    }

}
