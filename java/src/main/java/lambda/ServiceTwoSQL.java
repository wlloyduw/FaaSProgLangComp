package lambda;

import saaf.Inspector;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.s3.AmazonS3Client;
import com.amazonaws.services.s3.model.S3Object;
import com.amazonaws.services.s3.model.GetObjectRequest;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.io.*;
import java.util.*;

/**
 * uwt.lambda_test::handleRequest
 * 
 * @author wlloyd
 * @author David Perez
 */
public class ServiceTwoSQL implements RequestHandler<Request, HashMap<String, Object>> {

    public List<String[]> readCsv(InputStream input) throws IOException {
        List<String[]> records = new ArrayList<String[]>();
        InputStreamReader isReader = new InputStreamReader(input);
        BufferedReader reader = new BufferedReader(isReader);
        String str;
        // change to for?
        while ((str = reader.readLine()) != null) {
            records.add(str.split(","));
        }
        return records;
    }

    public void writeRecords(List<String[]> Records, String url, String username, String password, String mytable,
            int batchSize) {
        try {
            Connection con = DriverManager.getConnection(url, username, password);
            PreparedStatement ps = con.prepareStatement("DROP TABLE IF EXISTS `" + mytable + "`;");
            ps.execute();
            ps = con.prepareStatement("CREATE TABLE " + mytable
                    + " (Region VARCHAR(40), Country VARCHAR(40), `Item Type` VARCHAR(40), `Sales Channel` VARCHAR(40),`Order Priority` VARCHAR(40), `Order Date` VARCHAR(40),`Order ID` INT PRIMARY KEY, `Ship Date` VARCHAR(40), `Units Sold` INT,`Unit Price` DOUBLE, `Unit Cost` DOUBLE, `Total Revenue` DOUBLE, `Total Cost` DOUBLE, `Total Profit` DOUBLE, `Order Processing Time` INT, `Gross Margin` FLOAT) ENGINE = MyISAM;");
            ps.execute();
            String mySql = "insert into " + mytable
                    + " (Region, Country, `Item Type`, `Sales Channel`, `Order Priority`, `Order Date`, `Order ID`, `Ship Date`, `Units Sold`, `Unit Price`, `Unit Cost`, `Total Revenue`, `Total Cost`, `Total Profit`, `Order Processing Time`, `Gross Margin`) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? ,? ,? ,?)";
            PreparedStatement statement = con.prepareStatement(mySql);
            Records.remove(0);
            try {
                int i = 0;
                for (String[] record : Records) {
                    statement.setString(1, record[0]);
                    statement.setString(2, record[1]);
                    statement.setString(3, record[2]);
                    statement.setString(4, record[3]);
                    statement.setString(5, record[4]);
                    statement.setString(6, record[5]);
                    statement.setString(7, record[6]);
                    statement.setString(8, record[7]);
                    statement.setString(9, record[8]);
                    statement.setString(10, record[9]);
                    statement.setString(11, record[10]);
                    statement.setString(12, record[11]);
                    statement.setString(13, record[12]);
                    statement.setString(14, record[13]);
                    statement.setString(15, record[14]);
                    statement.setString(16, record[15]);
                    statement.addBatch();
                    if (++i % batchSize == 0) {
                        statement.executeBatch();
                    }
                }
                statement.executeBatch();
                statement.close();
                con.close();
            } catch (Exception e) {
                System.out.println("Exection using csvreader: " + e);
            }
        } catch (Exception e) {
            System.out.println("Got an exception working with MySQL! ");
            System.out.println(e.getMessage());
        }
    }

    public HashMap<String, Object> handleRequest(Request request, Context context) {
        Inspector inspector = new Inspector();
        inspector.inspectAll();
        String bucketname = request.getBucketName();
        String key = request.getKey();
        String mytable = request.getTableName();
        int batchsize = request.getBatchSize();

        AmazonS3Client s3 = new AmazonS3Client();
        s3.setEndpoint("s3.amazonaws.com");
        S3Object obj = s3.getObject(new GetObjectRequest(bucketname, key));

        InputStream objectData = obj.getObjectContent();
        try {
            String username = System.getenv("username");
            String password = System.getenv("password");
            // String databaseName = System.getenv("databaseName");
            String url = System.getenv("url");

            List<String[]> records = readCsv(objectData);
            writeRecords(records, url, username, password, mytable, batchsize);

        } catch (Exception e) {
            System.out.println(e.getMessage());
        }

        inspector.addAttribute("value", "Finished with reading csv into database");
        inspector.inspectAllDeltas();
        return inspector.finish();
    }
}
