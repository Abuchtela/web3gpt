"use server"

import { createPublicClient, http } from "viem"

import { API_KEYS, API_URLS } from "@/lib/viem-utils"
import type { VerifyContractParams } from "@/lib/functions/types"
import { DEFAULT_GLOBAL_CONFIG } from "@/lib/config"

export const verifyContract = async ({
  deployHash,
  standardJsonInput,
  encodedConstructorArgs,
  fileName,
  contractName,

  viemChain
}: VerifyContractParams) => {
  const publicClient = createPublicClient({
    chain: viemChain,
    transport: http()
  })

  if (!(await publicClient.getChainId())) {
    throw new Error(`Provider for chain ${viemChain.name} not available`)
  }

  const deployReceipt = await publicClient.getTransactionReceipt({ hash: deployHash }).catch((error) => {
    throw new Error(`Error getting transaction receipt: ${error.message}`)
  })

  const contractAddress = deployReceipt.contractAddress
  if (!contractAddress) {
    throw new Error(`Contract address not found in transaction receipt for ${deployHash}`)
  }

  const apiUrl = API_URLS[viemChain.id]
  const apiKey = API_KEYS[viemChain.id]
  if (!apiKey) {
    throw new Error(`Unsupported chain or explorer API_KEY.  Network: ${viemChain.name} ChainId: ${viemChain.id}`)
  }
  const stringifiedStandardJsonInput =
    typeof standardJsonInput === "string" ? standardJsonInput : JSON.stringify(standardJsonInput)

  const params = new URLSearchParams()
  params.append("apikey", apiKey)
  params.append("module", "contract")
  params.append("action", "verifysourcecode")
  params.append("contractaddress", contractAddress)
  params.append("sourceCode", stringifiedStandardJsonInput)
  params.append("codeformat", "solidity-standard-json-input")
  params.append("contractname", `${fileName}:${contractName}`)
  params.append("compilerversion", DEFAULT_GLOBAL_CONFIG.compilerVersion)
  // params.append("evmversion", "paris")
  // params.append("optimizationUsed", "1")
  // params.append("runs", "200")
  if (encodedConstructorArgs) {
    params.append("constructorArguements", encodedConstructorArgs)
  }
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
    },
    body: new URLSearchParams(params).toString()
  })
  if (!response.ok) {
    throw new Error(`Explorer API request failed with status ${response.status}`)
  }

  const verifyResult = (await response.json()) as { status: string; result: string }

  return verifyResult
}
