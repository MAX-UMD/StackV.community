package templateengine.helpers.vcn;

import java.util.ArrayList;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import templateengine.helpers.Helper;

public class DirectConnVLAN implements Helper {

    @Override
    public String apply(ArrayList<Object> obj) {
        JSONArray gatewayArr = (JSONArray) obj.get(0);
        for (Object eleObj : gatewayArr) {
            JSONObject ele = (JSONObject) eleObj;
            if (ele.get("type").equals("AWS Direct Connect")) {
                String to = (String) ((JSONObject)((JSONArray) ele.get("connects")).get(0)).get("to");                
                if (to.contains("?vlan")) {
                    return to.substring(to.indexOf("?vlan") + 6, to.length());
                } else {
                    return "any";
                }                
            }
        }
        return "";
    }
}
