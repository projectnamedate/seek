# Proguard / R8 keep rules for Seek release builds.
# Aim: strip unused code but preserve reflection targets + native-interface shims.

# -----------------------------------------------------------------------------
# React Native core (reanimated, turbomodules, TurboReactPackage)
# -----------------------------------------------------------------------------
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.common.** { *; }
-keepclassmembers class * extends com.facebook.react.bridge.ReactContextBaseJavaModule { *; }
-keepclassmembers class * extends com.facebook.react.bridge.NativeModule { *; }
-keepclasseswithmembernames class * { native <methods>; }

# Hermes
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jsi.** { *; }

# Expo core modules (reflection-heavy)
-keep class expo.modules.** { *; }
-keep class expo.core.** { *; }

# Solana Mobile Wallet Adapter - deep-link handling + intent surface
-keep class com.solanamobile.** { *; }

# Solana web3.js native bindings (tweetnacl, quick-crypto)
-keep class margelo.nitro.** { *; }
-keep class com.margelo.nitro.** { *; }

# Keep annotated members (JSON / Codable / serialization)
-keepclassmembers class ** {
    @com.facebook.react.bridge.ReactMethod *;
    @com.facebook.react.bridge.ReactProp *;
}

# Enum values used via reflection
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Parcelable creators
-keepclassmembers class * implements android.os.Parcelable {
    public static final ** CREATOR;
}

# Avoid stripping any javascript interface methods
-keepattributes JavascriptInterface

# Keep line numbers for crash reporting via Sentry
-keepattributes SourceFile,LineNumberTable
# Hide original source filenames (still gives line numbers for Sentry symbolication)
-renamesourcefileattribute SourceFile

# Suppress warnings for missing optional deps that RN/Expo reference
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn kotlin.reflect.**
-dontwarn com.google.common.**
