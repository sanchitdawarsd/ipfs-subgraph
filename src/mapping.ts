import { ByteArray, Bytes, DataSourceContext, DataSourceTemplate, dataSource, ipfs, json, log, ethereum, BigInt, JSONValueKind } from '@graphprotocol/graph-ts'
import { TokenURIModified, TokenMinted } from '../generated/CorpData/CorpData'
import { EmployeeData, PostContent } from '../generated/schema'
import { POST_ID_KEY, TIMESTAMP_KEY } from './helper'

function handleIPFSContent(uri: string, entityId: Bytes, timestamp: BigInt): void {
  let ipfsIndex = uri.indexOf('/ipfs/');
  if (ipfsIndex == -1) return;

  let context = new DataSourceContext();
  context.setBytes(POST_ID_KEY, entityId);
  context.setBigInt(TIMESTAMP_KEY, (timestamp));
  
  let hash = uri.substr(ipfsIndex + 6);
  DataSourceTemplate.createWithContext('IpfsContent', [hash], context);
}

export function handleTokenMinted(event: TokenMinted): void {
  let data = new EmployeeData(Bytes.fromUTF8(event.params.tokenId.toString()))
  data.tokenId = event.params.tokenId
  data.tx = event.transaction.hash
  data.uri = event.params.uri
  data.save()
  
  handleIPFSContent(data.uri, data.id, event.block.timestamp)
}

export function handleTokenURIModified(event: TokenURIModified): void {
  let id = event.params.tokenId.toString()
  let data = EmployeeData.load(Bytes.fromUTF8(id))
  if (data == null) {
    data = new EmployeeData(Bytes.fromUTF8(id))
  }
  data.tokenId = event.params.tokenId
  data.tx = event.transaction.hash
  data.uri = event.params.newUri
  data.save()
  
  handleIPFSContent(data.uri, data.id, event.block.timestamp)
}

export function handlePostContent(content: Bytes): void {
  let hash = dataSource.stringParam();
  let ctx = dataSource.context();
  let originalId = ctx.getBytes(POST_ID_KEY);
  
  // Create a unique ID by combining hash and original ID
  let uniqueId = Bytes.fromUTF8(hash + "-" + originalId.toHexString() + "-" + ctx.getBigInt(TIMESTAMP_KEY).toString());
  
  // Check for empty content
  if (content.length == 0) {
    log.warning("Empty content received for hash: {}", [hash]);
    return;
  }
  
  let post = PostContent.load(uniqueId);
  if (!post) {
    post = new PostContent(uniqueId);
  }
  
  log.info(
    "Processing IPFS content - Hash: {}, Original ID: {}, Unique ID: {}, Content Length: {}", 
    [hash, originalId.toHexString(), uniqueId.toHexString(), content.length.toString()]
  );

  // Parse the initial JSON content
  let contentStr = content.toString();
  if (contentStr.length == 0) {
    log.error("Content string is empty after conversion", []);
    return;
  }

  let jsonResult = json.fromString(contentStr);
  if (jsonResult.isNull()) {
    log.error("Failed to parse JSON content: {}", [contentStr]);
    return;
  }

  if (jsonResult.kind != JSONValueKind.OBJECT) {
    log.error("Initial content is not a JSON object", []);
    return;
  }

  let jsonObject = jsonResult.toObject();
  let employeeDetails = jsonObject.get("employee_details");
  
  if (employeeDetails === null) {
    log.error("employee_details is null", []);
    return;
  }

  if (employeeDetails.kind != JSONValueKind.STRING) {
    log.error("employee_details is not a string", []);
    return;
  }

  let encodedDetails = employeeDetails.toString();
  
  // Only set employeeId if it's not encoded data
  if (!isEncodedData(encodedDetails)) {
    // Parse the JSON string to get employee_id
    let parsedDetails = json.fromString(encodedDetails);
    if (!parsedDetails.isNull() && parsedDetails.kind == JSONValueKind.OBJECT) {
      let detailsObj = parsedDetails.toObject();
      let employeeId = detailsObj.get("employee_id");
      if (employeeId !== null && employeeId.kind == JSONValueKind.STRING) {
        post.employeeId = employeeId.toString(); // This will store just "sanchit hacker"
      } else {
        log.error("Invalid employee_id in details", []);
        post.employeeId = "";
      }
    } else {
      log.error("Failed to parse employee details JSON", []);
      post.employeeId = "";
    }
  } else {
    log.info("Skipping employeeId assignment for encoded data", []);
    post.employeeId = ""; // Set empty string for encoded data
  }
  
  post.content = contentStr;
  post.timestamp = ctx.getBigInt(TIMESTAMP_KEY);
  post.save();

  log.info(
    "Saved post - Unique ID: {}, Content Length: {}, Timestamp: {}, Is Encoded: {}", 
    [
      uniqueId.toHexString(), 
      contentStr.length.toString(),
      post.timestamp.toString(),
      isEncodedData(encodedDetails).toString()
    ]
  );
}

function isEncodedData(str: string): boolean {
  let base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  
  // Trim whitespace
  str = str.trim();
  
  // Check if each character is a valid base64 character
  for (let i = 0; i < str.length; i++) {
    if (base64Chars.indexOf(str.charAt(i)) == -1) {
      return false;
    }
  }
  
  return str.length > 0;
}

function decode(base64: string): string {
  let prefix = "data:";
  let base64Marker = ";base64,";
  
  // Check if string starts with data: prefix
  if (base64.startsWith(prefix)) {
    let base64Index = base64.indexOf(base64Marker);
    if (base64Index > -1) {
      return base64.substr(base64Index + base64Marker.length);
    }
  }
  
  // If no prefix found, return the original string
  return base64;
}