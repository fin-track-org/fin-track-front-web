package com.lazykit.cashbook;

import android.os.Bundle;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    // Android 12 미만에서 androidx.core:core-splashscreen 호환 동작(AppTheme.NoActionBarLaunch의
    // Theme.SplashScreen 속성 적용·postSplashScreenTheme 전환)을 위해 필요한 표준 호출이다
    // (IMPLEMENTATION_BRIEF_009 §5). sleep/timer로 splash를 붙잡지 않고, BridgeActivity를 그대로
    // 확장하며 별도 Activity를 만들지 않는다.
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);
    }
}
