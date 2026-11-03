import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
}

val keystorePropertiesFile = rootProject.file("keystore.properties")
val keystoreProperties = Properties().apply {
    if (keystorePropertiesFile.exists()) {
        keystorePropertiesFile.inputStream().use { load(it) }
    }
}
val appVersionCode = (System.getenv("ZIPPP_VERSION_CODE") ?: "1").toInt()
val appVersionName = System.getenv("ZIPPP_VERSION_NAME") ?: "1.0.0"
val apiBaseUrl = System.getenv("ZIPPP_API_BASE_URL") ?: "https://zippp.link"
val vercelBypass = System.getenv("ZIPPP_VERCEL_BYPASS") ?: ""
val googleServerClientId = System.getenv("ZIPPP_GOOGLE_SERVER_CLIENT_ID")
    ?: System.getenv("GOOGLE_CLIENT_ID")
    ?: ""

android {
    namespace = "link.zippp.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "link.zippp.app"
        minSdk = 26
        targetSdk = 35
        versionCode = appVersionCode
        versionName = appVersionName
        buildConfigField("String", "API_BASE_URL", "\"$apiBaseUrl\"")
        buildConfigField("String", "VERCEL_BYPASS", "\"$vercelBypass\"")
        buildConfigField("String", "GOOGLE_SERVER_CLIENT_ID", "\"$googleServerClientId\"")
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    flavorDimensions += "distribution"

    productFlavors {
        create("play") {
            dimension = "distribution"
            versionNameSuffix = "-play"
            buildConfigField("Boolean", "SIDELOAD_OTA_ENABLED", "false")
        }
        create("sideload") {
            dimension = "distribution"
            versionNameSuffix = "-sideload"
            buildConfigField("Boolean", "SIDELOAD_OTA_ENABLED", "true")
        }
    }

    signingConfigs {
        getByName("debug") {
            storeFile = file("${rootDir}/../debug.keystore").takeIf { it.exists() }
                ?: file("${System.getProperty("user.home")}/.android/debug.keystore")
        }
        if (keystorePropertiesFile.exists()) {
            create("release") {
                storeFile = rootProject.file(keystoreProperties.getProperty("storeFile"))
                storePassword = keystoreProperties.getProperty("storePassword")
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = signingConfigs.findByName("release")
        }
        debug {
            isMinifyEnabled = false
            applicationIdSuffix = ".debug"
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation(libs.androidx.navigation.compose)

    // CameraX
    implementation(libs.androidx.camera.core)
    implementation(libs.androidx.camera.camera2)
    implementation(libs.androidx.camera.lifecycle)
    implementation(libs.androidx.camera.view)

    // Secure storage (Android Keystore + private prefs)
    implementation(libs.androidx.datastore.preferences)

    // Network
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging)
    implementation(libs.retrofit)
    implementation(libs.retrofit.kotlinx.serialization)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.kotlinx.coroutines.android)

    // ML Kit barcode (QR scanning)
    implementation(libs.mlkit.barcode.scanning)

    // Google sign-in (Credential Manager)
    implementation(libs.androidx.credentials)
    implementation(libs.androidx.credentials.play.services.auth)
    implementation(libs.googleid)

    // Image loading
    implementation(libs.coil.compose)

    // Play flavor: In-App Updates
    "playImplementation"(libs.play.app.update.ktx)

    // Debug
    debugImplementation(libs.androidx.ui.tooling)
    debugImplementation(libs.androidx.ui.test.manifest)
}
