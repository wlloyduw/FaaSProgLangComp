package lambda;
import saaf.Inspector;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.s3.AmazonS3ClientBuilder;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.s3.model.ObjectMetadata;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Map.Entry;

import java.io.*;

import java.util.*;

/**
 * uwt.lambda_test::handleRequest
 * 
 * @author wlloyd
 * @author david perez
 */
public class ServiceThree implements RequestHandler<Request, HashMap<String, Object>> {

    public int hashSize(HashMap<String, String[]> theHashMap) {
        int count = 0;
        for (Entry<String, String[]> e : theHashMap.entrySet()) {
            count += e.getValue().length;
        }
        return count;
    }

    public String[] createWhereString(HashMap<String, String[]> filter_values, int size) {

        String[] filterBy = new String[size];
        int index = 0;

        for (Entry<String, String[]> e : filter_values.entrySet()) {
            String key = e.getKey();
            String[] filterArray = e.getValue();
            for (String value : filterArray) {
                String whereString = "WHERE ";
                String filterVal = "`" + key + "`";
                ;
                whereString += filterVal + "=\"" + value + "\"";
                filterBy[index] = whereString;
                index++;
            }
        }
        return filterBy;
    }

    public String[] createAggFunctionStrings(HashMap<String, String[]> aggregateValues, String mytable,
        String[] filterBy, int size) {
        String[] aggregateBy = new String[size];
        int index = 0;

        for (int i = 0; i < filterBy.length; i++) {
            String filterByString = filterBy[i];
            String aggString = "SELECT ";
            for (Entry<String, String[]> e : aggregateValues.entrySet()) {

                String key = e.getKey();
                String[] aggregateArray = e.getValue();
                for (String value : aggregateArray) {
                    aggString += key + "(`";
                    aggString += value + "`), ";
                }
            }

            aggString += " \"" + filterByString.replace('"', ' ') + "\" ";
            aggString += "AS `Filtered By` ";
            aggString += "FROM " + mytable + " ";
            aggString += filterByString;
            aggregateBy[index] = aggString;
            index++;
        }

        return aggregateBy;
    }

    public String Union_Queries(String[] queries) {
        String fullQuery = "";
        for (int i = 0; i < queries.length; i++) {
            fullQuery += queries[i];
            if (i != queries.length - 1) {
                fullQuery += " UNION ";
            }
        }
        fullQuery += ";";
        return fullQuery;
    }

    public HashMap<String, Object> handleRequest(Request request, Context context) {
        Inspector inspector = new Inspector();
        inspector.inspectAll();

        HashMap<String, String[]> filterByMap = new HashMap<String, String[]>();
        filterByMap.put("Region", new String[] { "Australia and Oceania" });
        filterByMap.put("Item Type", new String[] { "Office Supplies" });
        filterByMap.put("Sales Channel", new String[] { "Office Supplies" });
        filterByMap.put("Order Priority", new String[] { "Offline" });
        filterByMap.put("Country", new String[] { "Fiji" });

        HashMap<String, String[]> aggregateByMap = new HashMap<String, String[]>();
        aggregateByMap.put("max", new String[] { "Units Sold" });
        aggregateByMap.put("min", new String[] { "Units Sold" });
        aggregateByMap.put("avg", new String[] { "Order Processing Time", "Gross Margin", "Units Sold" });
        aggregateByMap.put("sum", new String[] { "Units Sold", "Total Revenue", "Total Profit" });

        String bucketname = request.getBucketName();
        String mytable = request.getTableName();
        String myTable = request.getTableName();
        int size = hashSize(filterByMap);
        String[] whereStrings = createWhereString(filterByMap, size);
        String[] queryStrings = createAggFunctionStrings(aggregateByMap, myTable, whereStrings, size);

        String fullQuery = Union_Queries(queryStrings);

        try {
            Properties properties = new Properties();
            properties.load(new FileInputStream("db.properties"));
            String username = System.getenv("username"); 
            String password = System.getenv("password"); 
            // String databaseName = System.getenv("databaseName");
            String url = System.getenv("url");

            Connection con = DriverManager.getConnection(url, username, password);
            PreparedStatement ps = con.prepareStatement(fullQuery);
            ResultSet rs = ps.executeQuery();
            StringBuilder queryResults = convertRStoCSV(rs);
            byte[] bytes = queryResults.toString().getBytes();
            InputStream is = new ByteArrayInputStream(bytes);
            ObjectMetadata meta = new ObjectMetadata();
            meta.setContentLength(bytes.length);
            meta.setContentType("text/plain");

            AmazonS3 s3Client = AmazonS3ClientBuilder.standard().build();
            s3Client.putObject(bucketname, "QueryResults.csv", is, meta);
            stressTest(10, mytable);
            con.close();
        } catch (Exception e) {
            System.out.println("Got an exception working with MySQL! " + e.getMessage());
        }

        inspector.addAttribute("value", "Finished with querying database");
        inspector.inspectAllDeltas();
        return inspector.finish();
    }

    private StringBuilder convertRStoCSV(ResultSet rs) throws Exception {
        StringBuilder sb = new StringBuilder();
        try {
            int numCols = rs.getMetaData().getColumnCount();
            while (rs.next()) {
                for (int i = 1; i <= numCols - 1; i++) {
                    sb.append(String.format(String.valueOf(rs.getString(i))) + ", ");

                }
                sb.append(String.format(String.valueOf(rs.getString(numCols))) + "\n");
            }

        } catch (SQLException e) {
            System.out.println("Got an exception working with convertRStoCSV! " + e.getMessage());
        }
        return sb;

    }

    public static void stressTest(int iterations, String mytable) {
        try {
            Connection con = DriverManager.getConnection(System.getenv("url"), System.getenv("username"),
                    System.getenv("password"));
            for (int i = 0; i < iterations; i++) {
                String testQuery = "SELECT * from " + mytable + ";";
                PreparedStatement ps = con.prepareStatement(testQuery);
                ResultSet rs = ps.executeQuery();
                int numCols = rs.getMetaData().getColumnCount();
                while (rs.next()) {
                    for (int j = 0; j < numCols; j++) {
                        rs.getString(j);
                    }
                }
            }
            con.close();
        } catch (SQLException e) {
            System.out.println("Got an exception working with stressTest! " + e.getMessage());
        }
    }
}
