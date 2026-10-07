# =============================================================================
# Doenit R8 rules
#
# This file contains ONLY rules that are not already covered elsewhere. R8
# merges, in order:
#   1. aapt's generated keeps for everything named by string in
#      AndroidManifest.xml or res/xml/ (MainActivity, CreateTaskActivity,
#      TaskWidgetProvider, TaskWidgetService, FileProvider, and every library
#      component) - build/intermediates/aapt_proguard_file/release/.../aapt_rules.txt
#   2. getDefaultProguardFile(...) from app/build.gradle - enum values()/valueOf(),
#      Parcelable CREATOR, @JavascriptInterface, native <methods>,
#      -keepattributes Signature/RuntimeVisibleAnnotations/AnnotationDefault,
#      -dontwarn androidx.**
#   3. consumerProguardFiles from every dependency (~60 sections), including
#      @capacitor/android (Plugin subclasses + @CapacitorPlugin dispatch),
#      @capgo/capacitor-social-login, firebase-components (ComponentRegistrar),
#      firebase-auth, billing, datastore, okhttp3, kotlinx-coroutines,
#      play-services-*, and all of AndroidX.
#
# ALWAYS check build/outputs/mapping/release/configuration.txt before adding a
# rule here - it is probably already present.
#
# NEVER add a blanket "-keep class <package>.** { *; }". It switches off
# obfuscation for a whole dependency tree and Google Play rejects the build
# ("DEX code optimization - Obfuscation below threshold").
# =============================================================================


# Cordova plugins (cordova-plugin-purchase -> cc.fovea.PurchasePlugin).
#
# org.apache.cordova.PluginManager instantiates plugins with
# Class.forName(name).newInstance(), where `name` is a string in
# res/xml/config.xml:
#   <feature name="InAppBillingPlugin">
#     <param name="android-package" value="cc.fovea.PurchasePlugin"/>
#   </feature>
# R8 cannot see that string. @capacitor/android's consumer rule
# (-keep public class * extends org.apache.cordova.*) keeps the class name and
# public methods but NOT the no-arg constructor, and the cordova-android
# 10.1.1 AAR ships no consumer rules of its own.
-keep public class * extends org.apache.cordova.CordovaPlugin {
    public <init>();
    public <methods>;
}


# This app's Capacitor plugins (BillingService, TaskWidget).
#
# @capacitor/android's consumer rules already cover public subclasses of
# com.getcapacitor.Plugin. This is a precise, annotation-scoped safety net that
# touches only our two plugins and stays correct if Capacitor ever changes its
# consumer rules.
-keep @com.getcapacitor.annotation.CapacitorPlugin class * {
    <init>(...);
    @com.getcapacitor.PluginMethod <methods>;
    @com.getcapacitor.annotation.PermissionCallback <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
    @com.getcapacitor.annotation.Permission <methods>;
}


# Gson.
#
# gson 2.10.1 ships no consumer rules (no META-INF/proguard/ in the jar) but is
# on the release classpath via io.ionic.libs:ioncamera-android (@capacitor/camera)
# and com.auth0.android:jwtdecode (@capgo/capacitor-social-login).
# io.ionic.libs.ioncameralib.model.* carries @SerializedName on its fields, so
# the field names MAY be obfuscated (the annotation supplies the wire name) but
# the fields must not be shrunk away. TypeToken's generic signatures must survive.
-keepclassmembers,allowobfuscation class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
-keep,allowobfuscation,allowshrinking class com.google.gson.reflect.TypeToken
-keep,allowobfuscation,allowshrinking class * extends com.google.gson.reflect.TypeToken


# Readable crash reports in Play Console. -renamesourcefileattribute replaces
# the real filename with the literal "SourceFile" so nothing leaks, while line
# numbers stay. AGP embeds mapping.txt in the AAB at
# BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map, so Play
# deobfuscates automatically - no manual mapping upload needed.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile


# Warnings only - no effect on shrinking or obfuscation. Facebook login is off,
# so the Facebook SDK is not a dependency, but @capgo/capacitor-social-login
# probes for it with Class.forName() and its consumer rules reference it.
-dontwarn com.facebook.**
-dontnote com.facebook.**
