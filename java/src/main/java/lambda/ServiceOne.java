package lambda;

import saaf.Inspector;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.s3.model.ObjectMetadata;
import java.io.InputStreamReader;
import com.amazonaws.services.s3.AmazonS3ClientBuilder;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.model.S3Object;
import com.amazonaws.services.s3.model.GetObjectRequest;
import com.amazonaws.services.lambda.runtime.LambdaLogger;

import java.io.*;
import java.util.*;

/**
 * uwt.lambda_test::handleRequest
 *
 * @author Wes Lloyd
 * @author Robert Cordingly
 * @author David Perez
 */
public class ServiceOne implements RequestHandler<Request, HashMap<String, Object>> {

    public List<String[]> readCsv(InputStream input, LambdaLogger logger) throws IOException {
        // csvfile['Body'].read().decode('utf-8').split("\n") as input
        List<String[]> records = new ArrayList<String[]>();
        InputStreamReader isReader = new InputStreamReader(input);
        BufferedReader reader = new BufferedReader(isReader);
        String str;
        // change to for?
        while ((str = reader.readLine()) != null) {
            str = str + ",0,0";
            records.add(str.split(","));
            logger.log(str);
        }
        isReader.close();
        return records;
    }

    public StringBuilder writeCsv(List<String[]> records, LambdaLogger logger) {
        StringBuilder sb = new StringBuilder();

        records.get(0)[14]="Order Processing Time";
        records.get(0)[15]="Gross Margin";
        sb.append(String.join(",", records.get(0)) +"\n");
        Set<Integer> unique_ids = new HashSet<Integer>();

        try {
            for (int i = 1; i < records.size() - 1; i++) {
                if (unique_ids.contains(Integer.parseInt(records.get(i)[6]))) {
                    continue;
                } else {
                    String val = records.get(i)[4];
                    if (val.equals("C")) {
                        records.get(i)[4] = "Critical";
                    } else if (val.equals("L")) {
                        records.get(i)[4] = "Low";
                    } else if (val.equals("M")) {
                        records.get(i)[4] = "Medium";
                    } else if (val.equals("H")) {
                        records.get(i)[4] = "High";
                    }

                    String[] date1_values = (records.get(i)[5]).split("/");
                    String[] date2_values = (records.get(i)[7]).split("/");
                    int month = Integer.parseInt(date1_values[0]);
                    int day = Integer.parseInt(date1_values[1]);
                    int year = Integer.parseInt(date1_values[2]);

                    int month2 = Integer.parseInt(date2_values[0]);
                    int day2 = Integer.parseInt(date2_values[1]);
                    int year2 = Integer.parseInt(date2_values[2]);

                    int order_time = ((year2 - year) * 365) + ((month2 - month) * 30) + (day2 - day);
                    float gross_margin = Float.parseFloat((records.get(i)[13]))
                            / Float.parseFloat((records.get(i)[11]));
                    records.get(i)[14] = (Integer.toString(order_time));
                    records.get(i)[15] = (String.valueOf(gross_margin));
                    logger.log(records.get(i)[14]);
                    logger.log(records.get(i)[15]);
                    sb.append(String.join(",", records.get(i)) + "\n");
                    unique_ids.add(Integer.parseInt(records.get(i)[6]));
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Can't parse file " + e);
        }
        return sb;
    }

    public HashMap<String, Object> handleRequest(Request request, Context context) {
        Inspector inspector = new Inspector();
        inspector.inspectAll();

        inspector.addAttribute("message",
                "bucketname is = " + request.getBucketName() + "! This is an attributed added to the Inspector!");

        String bucketname = request.getBucketName();
        String key = request.getKey();
	LambdaLogger logger = context.getLogger();
	logger.log("start getobj");
        AmazonS3 s3Client = AmazonS3ClientBuilder.standard().build();
        S3Object s3Object = s3Client.getObject(new GetObjectRequest(bucketname, key));
        InputStream objectData = s3Object.getObjectContent();
	logger.log("finished getobj");
        StringBuilder sw = null;
        try {
            logger.log("started reading csv");
            List<String[]> records = readCsv(objectData, logger);
            logger.log("finished reading csv, starting to write csv");
            sw = writeCsv(records, logger);
            logger.log("finished writing csv");
            objectData.close();

        } catch (IOException e) {
            System.out.println("Error reading csv: " + e);
        }
        logger.log("turning sw to bytes");
        String fullstring=sw.toString();
        sw.setLength(0);
        byte[] bytes = fullstring.getBytes();
        logger.log("bytes array created");

        InputStream is = new ByteArrayInputStream(bytes);
        logger.log("inputstream created");
        ObjectMetadata meta = new ObjectMetadata();
        logger.log("out");
        meta.setContentLength(bytes.length);
        meta.setContentType("text/plain");
                logger.log("out2");

        AmazonS3 s3Client2 = AmazonS3ClientBuilder.standard().build();
        logger.log("out3");

        s3Client2.putObject(bucketname, key.substring(0, key.lastIndexOf('.')) + "/" + System.currentTimeMillis() + "_"
                + inspector.getAttribute("uuid") + ".csv", is, meta);
        logger.log("out4");

        inspector.addAttribute("value", "Bucket: " + bucketname + " key:" + key + " processed. record 0 = ");
        logger.log("out5");

        inspector.inspectAllDeltas();
        return inspector.finish();
    }
}
