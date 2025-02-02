import { ByteArray, Bytes, DataSourceContext, DataSourceTemplate, dataSource, ipfs, json, log, ethereum, bigInt } from '@graphprotocol/graph-ts'
import { TokenURIModified, TokenMinted } from '../generated/CorpData/CorpData'
import { EmployeeData, PostContent } from '../generated/schema'
import { POST_ID_KEY } from './helper'

function handleIPFSContent(uri: string, entityId: Bytes): void {
  let ipfsIndex = uri.indexOf('/ipfs/');
  if (ipfsIndex == -1) return;

  let context = new DataSourceContext();
  context.setBytes(POST_ID_KEY, entityId);
  
  let hash = uri.substr(ipfsIndex + 6);
  DataSourceTemplate.createWithContext('IpfsContent', [hash], context);
}

export function handleTokenMinted(event: TokenMinted): void {
  let data = new EmployeeData(Bytes.fromUTF8(event.params.tokenId.toString()))
  data.tokenId = event.params.tokenId
  data.tx = event.transaction.hash
  data.uri = event.params.uri
  data.save()
  
  handleIPFSContent(data.uri, data.id)
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
  
  handleIPFSContent(data.uri, data.id)
}

export function handlePostContent(content: Bytes): void {
  let hash = dataSource.stringParam();
  let ctx = dataSource.context();
  
  let id = ctx.getBytes(POST_ID_KEY);
  
  let post = PostContent.load(id);
  if (!post) {
    post = new PostContent(id);
  }
  
  log.info(
    "Processing IPFS content - Hash: {}, ID: {}", 
    [
      hash, 
      id.toHexString(),
    ]
  );
  
  post.hash = hash;
  post.content = content.toString();
  post.save();
}