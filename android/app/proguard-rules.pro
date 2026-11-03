# Kotlinx Serialization
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.**
-keepclassmembers class kotlinx.serialization.json.** { *** Companion; }
-keepclasseswithmembers class kotlinx.serialization.** { *; }
-keep,includedescriptorclasses class link.zippp.app.data.**$$serializer { *; }
-keepclassmembers class link.zippp.app.data.** { *** Companion; }

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
