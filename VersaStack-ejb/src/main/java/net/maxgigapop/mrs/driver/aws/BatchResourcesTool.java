/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package net.maxgigapop.mrs.driver.aws;

import com.hp.hpl.jena.ontology.OntModel;
import com.hp.hpl.jena.ontology.OntModelSpec;
import com.hp.hpl.jena.ontology.OntResource;
import com.hp.hpl.jena.query.Query;
import com.hp.hpl.jena.query.QueryExecution;
import com.hp.hpl.jena.query.QueryExecutionFactory;
import com.hp.hpl.jena.query.QueryFactory;
import com.hp.hpl.jena.query.QuerySolution;
import com.hp.hpl.jena.query.ResultSet;
import com.hp.hpl.jena.rdf.model.*;
import java.io.StringWriter;
import java.util.ArrayList;
import java.util.List;
import java.util.Stack;
import net.maxgigapop.mrs.common.ModelUtil;
import net.maxgigapop.mrs.common.Mrs;
import net.maxgigapop.mrs.common.RdfOwl;

/**
 *
 * @author muzcategui
 */

/*
 ***********************************************
 Class to deal with bacthed resources, meaning there
 could me multiple resources that have the same 
 properties
 ***********************************************
 */
public class BatchResourcesTool {

    public Resource isbatched(OntModel model, Resource r) {
        Resource resource = null;
        String query = "SELECT ?batch WHERE {<" + r + "> mrs:hasBatch ?batch}";
        ResultSet r1 = executeQuery(query, model);
        if (r1.hasNext()) {
            QuerySolution q1 = r1.next();
            RDFNode p = q1.get("batch");
            resource = p.asResource();
        }
        return resource;
    }

    public Resource getBatchedResource(OntModel model, Resource r, String nameRule) {
        String resource = r.toString();
        resource += nameRule;
        System.out.println(resource);
        return model.getResource(resource);
    }

    public int getNumberBatched(OntModel model, Resource r) {
        int i = 0;
        String query = "SELECT ?number WHERE {<" + r + "> mrs:value ?number}";
        ResultSet r1 = executeQuery(query, model);
        if (r1.hasNext()) {
            QuerySolution q1 = r1.next();
            RDFNode number = q1.get("number");
            Literal literal = number.asLiteral();
            i = Integer.parseInt(literal.toString());
        }
        return i;
    }

    /*
     *************************************************************************
     Method to modify a model containing batches into specific resources, this
     method provides an exact representation of a model after all the batched 
     resources have been explicitly specified in the model
     *************************************************************************
     */
    public OntModel addBatchToModel(OntModel model) throws Exception {
        String query;
        OntModel modelCopy = model;
        List<Resource> resourcesToDelete = new ArrayList();

        ModelUtil.marshalOntModel(modelCopy);
        ModelUtil.marshalOntModel(model);

        //query for the batches
        query = "SELECT ?r ?n ?batch WHERE {?r mrs:hasBatch ?batch ."
                + "?batch mrs:value ?n}";
        ResultSet r1 = executeQuery(query, model);
        OntModel tmp = ModelFactory.createOntologyModel(OntModelSpec.OWL_MEM_MICRO_RULE_INF);

        //create the new model with the batch resources 
        while (r1.hasNext()) {
            QuerySolution q1 = r1.next();
            int n = Integer.parseInt(q1.get("n").asLiteral().toString());
            String name = q1.get("r").asResource().toString();
            Resource resourceCopy = model.getResource(name);
            resourcesToDelete.add(resourceCopy);
            resourcesToDelete.add(q1.getResource("batch").asResource());

            //insert into the copy model all the batches identified by number
            for (int i = 0; i < n; i++) {
                //create a new bacth batchResource
                String resourceName = name + "batch" + Integer.toString(i);
                Resource newResource = tmp.getResource(resourceName);
                if (newResource == null) {
                    newResource = tmp.createResource(resourceName);
                }
                StmtIterator iterator = resourceCopy.listProperties();
                while (iterator.hasNext()) {
                    Statement next = iterator.next();
                    Property property = next.getPredicate();
                    RDFNode object = next.getObject();
                    if (object.isResource()) {
                        //if the object is a batchResource, this batchResource could be batched too, in this case we have to scenarios
                        //new batch batchResource to single batchResource and new batch batchResource to batch
                        query = "SELECT ?x WHERE {<" + object.asResource().toString() + "> mrs:hasBatch ?x}";
                        ResultSet r2 = executeQuery(query, model);
                        if (!r2.hasNext()) { //case of new batch batchResource to single batchResource
                            tmp.add(tmp.createStatement(newResource, next.getPredicate(), object.asResource()));
                        } else { //case of  new batch batchResource to batch batchResource
                            String re = object.asResource().toString() + "batch" + Integer.toString(i);
                            Resource childResource = tmp.getResource(re);
                            if (childResource == null) {
                                childResource = tmp.createResource(re);
                            }
                            tmp.add(tmp.createStatement(newResource, next.getPredicate(), childResource));
                        }
                    } else {
                        tmp.add(tmp.createStatement(newResource, next.getPredicate(), object.asLiteral()));
                    }

                }

                //remove the hasBatch property
                tmp.remove(newResource.getProperty(Mrs.hasBatch));

                //get the objects on top of this batchResource
                query = "SELECT ?parent ?property WHERE {?parent ?property <" + resourceCopy + ">}";
                ResultSet r2 = executeQuery(query, model);
                while (r2.hasNext()) {
                    //if you find the parent and the parent has a batch, link new batch resources with parent's batch resources 
                    QuerySolution q2 = r2.next();
                    String p = q2.get("property").asResource().toString();
                    Property property = tmp.createProperty(p);
                    Resource parent = q2.getResource("parent").asResource();
                    //if the object is a batchResource, this batchResource could be batched too, in this case we have to scenarios
                    //new batch batchResource to single batchResource and new batch batchResource to batch
                    query = "SELECT ?x WHERE {<" + parent.asResource().toString() + "> mrs:hasBatch ?x}";
                    ResultSet r3 = executeQuery(query, model);
                    if (!r3.hasNext()) { //case of parent batchResource to new batch batchResource 
                        tmp.add(tmp.createStatement(parent, property, newResource));
                    } else { //case of  new batch batchResource to batch batchResource
                        String re = parent.asResource().toString() + "batch" + Integer.toString(i);
                        Resource parentResource = tmp.getResource(re);
                        if (parentResource == null) {
                            parentResource = tmp.createResource(re);
                        }
                        tmp.add(tmp.createStatement(parentResource, property, newResource));
                    }
                }
            }
        }

        //clean up every old batchResource that had batch and its corresponding batch statement
        for (Resource r : resourcesToDelete) {
            model.removeAll(r, null, null);
            model.removeAll(null, null, r);
        }

        modelCopy.add(tmp.listStatements().toList());
        return modelCopy;
    }

    /*
     *************************************************************************
     Method to modify a model containing explicit resources into batches, this
     method provides an abstract representation of a model after all the explicit
     resources are unified into batch resources if they are part of a batch
     *************************************************************************
     */
    public OntModel addModelToBatch(OntModel model) {
        OntModel tmp = ModelFactory.createOntologyModel(OntModelSpec.OWL_MEM_MICRO_RULE_INF);
        tmp.add(model.listStatements()); //make a copy by value of original model
        String query = "SELECT ?r WHERE {?r Rdf:type NamedIndividual ."
                + "FILTER regex(?r,\"batch\")}";
        ResultSet r = executeQuery(query, tmp);
        while (r.hasNext()) {
            //find each of the bacthed resources 
            QuerySolution q = r.next();
            Resource batchResource = q.get("r").asResource();
            String batchResourceName = batchResource.toString(); //name of original batchResource
            String baseBatchResourceName = batchResourceName.split("batch")[0] + "batch"; //base name of all
            String abstractResourceName = batchResourceName.split("batch")[0]; //name of abstract batchResource

            Resource re = model.getResource(baseBatchResourceName);
            if (re != null) {//already exists but increment the amount of batches
                //since the batchResource already exists, we just need to modify the value
                Statement valueStm = re.getProperty(Mrs.value);
                int n = Integer.parseInt(valueStm.getObject().asLiteral().toString()) + 1; //add one to current value
                model.remove(valueStm);
                model.add(model.createStatement(valueStm.getSubject(), valueStm.getPredicate(), Integer.toString(n))); //add the new value statement
            } else { //resource do not exist needs to be create and see dependencies
                //create  base bacth and abstract resource and link them

                //1) create abstract resource and give it a name and same properties as children
                Resource abstractResource = model.createResource(abstractResourceName);
                StmtIterator iterator = batchResource.listProperties();
                while (iterator.hasNext()) {
                    Statement next = iterator.next();
                    Property property = next.getPredicate();
                    RDFNode object = next.getObject();

                    //2 need to worry on downlink dependencies that might need to be changed
                    //if the child resource has a batch
                    if (object.isResource()) {
                        query = "SELECT ?r ?c WHERE {<" + batchResourceName + "> ?property ?c ."
                                + "FILTER regex(?c,\"batch\")}";

                        //if this happend child resource is a batch take care of it
                        ResultSet r2 = executeQuery(query, tmp);
                        if (r2.hasNext()) {
                            //String childResourceName = r2.next().get("?c");
                        }
                    } else {

                    }
                }
            }

        }
        return model;
    }

    /**
     * ****************************************************************
     * function that executes a query using a model addition/subtraction and a
     * reference model, returns the result of the query
     * ****************************************************************
     */
    private ResultSet executeQuery(String queryString, OntModel refModel) {
        queryString = "prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n"
                + "prefix owl: <http://www.w3.org/2002/07/owl#>\n"
                + "prefix nml: <http://schemas.ogf.org/nml/2013/03/base#>\n"
                + "prefix mrs: <http://schemas.ogf.org/mrs/2013/12/topology#>\n"
                + queryString;

        //do the query in SparkQL syntax
        Query query = QueryFactory.create(queryString);
        QueryExecution qexec = QueryExecutionFactory.create(query, refModel);
        ResultSet r = qexec.execSelect();

        return r;
    }
}
