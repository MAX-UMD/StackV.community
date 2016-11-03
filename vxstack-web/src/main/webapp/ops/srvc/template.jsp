<%@page contentType="text/html" pageEncoding="UTF-8"%>
<%@page errorPage = "/vxstack-web/errorPage.jsp" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/sql" prefix="sql"%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/functions" prefix="fn" %>
<jsp:useBean id="user" class="web.beans.userBeans" scope="session" />
<jsp:setProperty name="user" property="*" />  
<jsp:useBean id="serv" class="web.beans.serviceBeans" scope="page" />
<jsp:setProperty name="serv" property="*" />  
<c:if test="${user.loggedIn == false}">
    <c:redirect url="/index.jsp" />
</c:if>
<!DOCTYPE html>
<html >    
    <head>   
        <meta charset="UTF-8">
        <title>Template Service</title>
        <script src="/vxstack-web/js/jquery/jquery.js"></script>
        <script src="/vxstack-web/js/bootstrap.js"></script>
        <script src="/vxstack-web/js/nexus.js"></script>

        <link rel="stylesheet" href="/vxstack-web/css/animate.min.css">
        <link rel="stylesheet" href="/vxstack-web/css/font-awesome.min.css">
        <link rel='stylesheet prefetch' href='http://fonts.googleapis.com/css?family=Roboto:400,100,400italic,700italic,700'>
        <link rel="stylesheet" href="/vxstack-web/css/bootstrap.css">
        <link rel="stylesheet" href="/vxstack-web/css/style.css">
        <link rel="stylesheet" href="/vxstack-web/css/driver.css">
    </head>

    <sql:setDataSource var="rains_conn" driver="com.mysql.jdbc.Driver"
                       url="jdbc:mysql://localhost:3306/rainsdb"
                       user="root"  password="root"/>

    <body>
        <!-- NAV BAR -->
        <div id="nav">
        </div>
        <!-- SIDE BAR -->
        <div id="sidebar">            
        </div>
        <!-- MAIN PANEL -->
        <div id="main-pane">
            <c:choose>                  
                <c:when test="${empty param.ret}">  <!-- Display this section when no return value supplied -->
                    <div id="service-specific">                        
                        <div id="service-top">
                            <div id="service-title">

                            </div>
                            <div id="service-menu">
                                <c:if test="${not empty param.self}">
                                    <button type="button" id="button-service-return">Cancel</button>
                                </c:if>
                                <table class="management-table">

                                </table>
                            </div>
                        </div>
                        <div id="service-bottom">
                            <div id="service-fields">
                                <form id="template-form" action="/vxstack-web/ServiceServlet" method="post">
                                    <input type="hidden" name="userID" value="${user.getId()}"/>
                                    <table class="management-table" id="service-form" style="margin-bottom: 0px;"> 

                                    </table>
                                </form>
                            </div>
                        </div>
                    </div> 
                </c:when>

                <c:otherwise>                       <!-- Display this section when return value supplied -->
                    <div class="form-result" id="service-result">
                        <c:choose>
                            <c:when test="${param.ret == '0'}">
                                Installation Success!
                            </c:when>
                            <c:when test="${param.ret == '1'}">
                                Error 1.
                            </c:when>    
                            <c:when test="${param.ret == '2'}">
                                Error 2.
                            </c:when>    
                            <c:when test="${param.ret == '3'}">
                                Error 3.
                            </c:when>                                      
                        </c:choose>                        

                        <br><a href="/vxstack-web/ops/srvc/template.jsp?self=true">Repeat.</a>                                
                        <br><a href="/vxstack-web/ops/catalog.jsp">Return to Services.</a>
                        <br><a href="/vxstack-web/orch/graphTest.jsp">Return to Graphic Orchestration.</a>
                    </div>
                </c:otherwise>
            </c:choose>
        </div>
        <!-- TAG PANEL -->       
        <div id="tag-panel"> 
        </div>        
        <!-- JS -->
        <script>
            $(function () {
                $("#tag-panel").load("/vxstack-web/tagPanel.jsp", null);
            });
        </script>        
    </body>
</html>