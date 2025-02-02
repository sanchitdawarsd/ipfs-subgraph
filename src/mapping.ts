import { ByteArray, Bytes, DataSourceContext, DataSourceTemplate, dataSource, ipfs, json, log, ethereum, bigInt } from '@graphprotocol/graph-ts'
import { TokenURIModified, TokenMinted } from '../generated/CorpData/CorpData'
import { EmployeeData, PostContent } from '../generated/schema'
import { POST_ID_KEY, POST_ID_KEY_UPDATED, addQm } from './helper'

function handleIPFSContent(uri: string, entityId: Bytes, isUpdate: boolean, block: ethereum.Block): void {
  let ipfsIndex = uri.indexOf('/ipfs/');
  if (ipfsIndex == -1) return;

  let context = new DataSourceContext();
  context.setBytes(isUpdate ? POST_ID_KEY_UPDATED : POST_ID_KEY, entityId);
  context.setString('blockNumber', block.number.toString());
  context.setString('timeStamp', block.timestamp.toString());
  
  let hash = uri.substr(ipfsIndex + 6);
  DataSourceTemplate.createWithContext('IpfsContent', [hash], context);
}

export function handleTokenMinted(event: TokenMinted): void {
  let data = new EmployeeData(Bytes.fromUTF8(event.params.tokenId.toString()))
  data.tokenId = event.params.tokenId
  data.tx = event.transaction.hash
  data.uri = event.params.uri
  data.save()
  
  handleIPFSContent(data.uri, data.id, false, event.block)
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
  
  handleIPFSContent(data.uri, data.id, true, event.block)
}

export function handlePostContent(content: Bytes): void {
  let hash = dataSource.stringParam();
  let ctx = dataSource.context();
  let blockNumber = (ctx.getString('blockNumber'));
  let timeStamp = (ctx.getString('timeStamp'));
  
  // Try to load with updated key first
  let id = ctx.getBytes(POST_ID_KEY_UPDATED);
  if (id.length == 0) {
    id = ctx.getBytes(POST_ID_KEY);
  }
  
  // Create unique ID for this version of the content
  let versionedId = Bytes.fromUTF8(id.toHexString() + '-' + blockNumber.toString());
  
  let post = PostContent.load(versionedId);
  if (!post) {
    post = new PostContent(versionedId);
    post.originalId = id;
    post.version = 0;
  } else {
    post.version = post.version + 1;
  }
  
  log.info(
    "Processing IPFS content - Hash: {}, ID: {}, Block: {}, Version: {}", 
    [
      hash, 
      id.toHexString(),
      blockNumber.toString(),
      post.version.toString()
    ]
  );
  
  post.hash = hash;
  post.content = content.toString();
  post.blockNumber = blockNumber;
  post.timestamp = timeStamp;
  post.save();
}