package link.zippp.app.data

import kotlinx.coroutines.Dispatchers
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit
import link.zippp.app.BuildConfig

class ApiException(val code: String) : Exception(code)

class ApiClient(
    private val baseUrl: String = BuildConfig.API_BASE_URL,
) {
    private val json = Json {
        ignoreUnknownKeys = true
        explicitNulls = false
    }

    private val client = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(90, TimeUnit.SECONDS)
        .writeTimeout(90, TimeUnit.SECONDS)
        .addInterceptor { chain ->
            val builder = chain.request().newBuilder()
            // Preview builds only: the value is injected at build time.
            if (BuildConfig.VERCEL_BYPASS.isNotBlank()) {
                builder.header("x-vercel-protection-bypass", BuildConfig.VERCEL_BYPASS)
            }
            chain.proceed(builder.build())
        }
        .build()

    suspend fun claim(
        code: String,
        deviceId: String,
        deviceName: String,
        appVersion: String,
    ): PairClaimResponse = postSession(
        path = "/api/auth/pair/claim",
        jsonBody = """
            {"pairing_code":${json.encodeToString(code)},
             "device_id":${json.encodeToString(deviceId)},
             "device_name":${json.encodeToString(deviceName)},
             "app_version":${json.encodeToString(appVersion)},
             "platform":"android"}
        """.trimIndent(),
    )

    suspend fun requestMagicLink(email: String): MagicLinkRequestResponse =
        withContext(Dispatchers.IO) {
            val body = """{"email":${json.encodeToString(email)}}""".toRequestBody(JSON)
            val request = Request.Builder()
                .url("$baseUrl/api/auth/magic-link/request")
                .post(body)
                .build()
            client.newCall(request).execute().use { response ->
                val text = response.body?.string().orEmpty()
                if (!response.isSuccessful) {
                    val parsed = runCatching { json.decodeFromString<MagicLinkRequestResponse>(text) }.getOrNull()
                    throw ApiException(parsed?.code ?: "HTTP_${response.code}")
                }
                json.decodeFromString<MagicLinkRequestResponse>(text)
            }
        }

    suspend fun consumeMagicLink(
        token: String,
        deviceId: String,
        deviceName: String,
        appVersion: String,
    ): PairClaimResponse = postSession(
        path = "/api/auth/magic-link/consume",
        jsonBody = """
            {"token":${json.encodeToString(token)},
             "device_id":${json.encodeToString(deviceId)},
             "device_name":${json.encodeToString(deviceName)},
             "app_version":${json.encodeToString(appVersion)},
             "platform":"android"}
        """.trimIndent(),
    )

    suspend fun exchangeGoogle(
        idToken: String,
        deviceId: String,
        deviceName: String,
        appVersion: String,
    ): PairClaimResponse = postSession(
        path = "/api/auth/mobile/google",
        jsonBody = """
            {"id_token":${json.encodeToString(idToken)},
             "device_id":${json.encodeToString(deviceId)},
             "device_name":${json.encodeToString(deviceName)},
             "app_version":${json.encodeToString(appVersion)},
             "platform":"android"}
        """.trimIndent(),
    )

    private suspend fun postSession(path: String, jsonBody: String): PairClaimResponse =
        withContext(Dispatchers.IO) {
            val request = Request.Builder()
                .url("$baseUrl$path")
                .post(jsonBody.toRequestBody(JSON))
                .build()
            client.newCall(request).execute().use { response ->
                val text = response.body?.string().orEmpty()
                if (!response.isSuccessful) {
                    val parsed = runCatching { json.decodeFromString<PairClaimResponse>(text) }.getOrNull()
                    throw ApiException(parsed?.code ?: "HTTP_${response.code}")
                }
                json.decodeFromString<PairClaimResponse>(text)
            }
        }

    suspend fun extract(token: String, jpeg: ByteArray): ExtractResponse = withContext(Dispatchers.IO) {
        val multipart = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart(
                "image",
                "receipt.jpg",
                jpeg.toRequestBody("image/jpeg".toMediaType()),
            )
            .build()

        val request = Request.Builder()
            .url("$baseUrl/api/extract")
            .header("Authorization", "Bearer $token")
            .post(multipart)
            .build()

        client.newCall(request).execute().use { response ->
            val text = response.body?.string().orEmpty()
            if (response.code == 401) throw ApiException("DEVICE_REVOKED")
            if (!response.isSuccessful) {
                val parsed = runCatching { json.decodeFromString<ExtractResponse>(text) }.getOrNull()
                throw ApiException(parsed?.error ?: "HTTP_${response.code}")
            }
            json.decodeFromString<ExtractResponse>(text)
        }
    }

    suspend fun append(token: String, requestBody: AppendRequest): AppendResponse =
        withContext(Dispatchers.IO) {
            val body = json.encodeToString(requestBody).toRequestBody(JSON)
            val request = Request.Builder()
                .url("$baseUrl/api/sheets/append")
                .header("Authorization", "Bearer $token")
                .post(body)
                .build()

            client.newCall(request).execute().use { response ->
                val text = response.body?.string().orEmpty()
                val parsed = runCatching { json.decodeFromString<AppendResponse>(text) }.getOrNull()
                if (response.code == 401) throw ApiException("DEVICE_REVOKED")
                if (parsed == null) throw ApiException("HTTP_${response.code}")
                parsed
            }
        }

    suspend fun listSpaces(token: String): SpaceListResponse =
        withContext(Dispatchers.IO) {
            val request = Request.Builder()
                .url("$baseUrl/api/spaces")
                .header("Authorization", "Bearer $token")
                .get()
                .build()

            client.newCall(request).execute().use { response ->
                val text = response.body?.string().orEmpty()
                if (response.code == 401) throw ApiException("DEVICE_REVOKED")
                val parsed = runCatching { json.decodeFromString<SpaceListResponse>(text) }.getOrNull()
                if (parsed == null) throw ApiException("HTTP_${response.code}")
                parsed
            }
        }

    suspend fun me(token: String): MeResponse =
        withContext(Dispatchers.IO) {
            val request = Request.Builder()
                .url("$baseUrl/api/auth/mobile/me")
                .header("Authorization", "Bearer $token")
                .get()
                .build()

            client.newCall(request).execute().use { response ->
                val text = response.body?.string().orEmpty()
                if (response.code == 401) throw ApiException("DEVICE_REVOKED")
                val parsed = runCatching { json.decodeFromString<MeResponse>(text) }.getOrNull()
                if (parsed == null) throw ApiException("HTTP_${response.code}")
                parsed
            }
        }

    /** Ask the server for a scan id so manual entry can append like a scan. */
    suspend fun createManualScan(token: String): ManualScanResponse =
        withContext(Dispatchers.IO) {
            val request = Request.Builder()
                .url("$baseUrl/api/scan/manual")
                .header("Authorization", "Bearer $token")
                .post("{}".toRequestBody(JSON))
                .build()

            client.newCall(request).execute().use { response ->
                val text = response.body?.string().orEmpty()
                if (response.code == 401) throw ApiException("DEVICE_REVOKED")
                val parsed =
                    runCatching { json.decodeFromString<ManualScanResponse>(text) }.getOrNull()
                if (parsed == null) throw ApiException("HTTP_${response.code}")
                parsed
            }
        }

    /** Field-level correction telemetry. Failure never blocks the accept path. */
    suspend fun logCorrections(token: String, requestBody: CorrectionRequest) =
        withContext(Dispatchers.IO) {
            val body = json.encodeToString(requestBody).toRequestBody(JSON)
            val request = Request.Builder()
                .url("$baseUrl/api/corrections")
                .header("Authorization", "Bearer $token")
                .post(body)
                .build()

            client.newCall(request).execute().use { response ->
                if (response.code == 401) throw ApiException("DEVICE_REVOKED")
            }
        }

    companion object {
        private val JSON = "application/json; charset=utf-8".toMediaType()
    }
}
