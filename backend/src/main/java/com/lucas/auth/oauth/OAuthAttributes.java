package com.lucas.auth.oauth;

import com.lucas.auth.entity.AuthProvider;
import com.lucas.auth.entity.UserRole;
import com.lucas.user.entity.Users;
import lombok.Builder;
import lombok.Getter;

import java.util.Map;

/**
 * 각 소셜에서 받아오는 데이터가 다르므로
 * 소셜별로 데이터를 받는 데이터를 분기 처리하는 DTO 클래스
 */
@Getter
public class OAuthAttributes {
    private String nameAttributeKey; // OAuth2 로그인 진행 시 키가 되는 필드 값, PK와 같은 의미
    private OAuth2UserInfo oauth2UserInfo; // 소셜 타입별 로그인 유저 정보(닉네임, 이메일 등등)

    @Builder
    private OAuthAttributes(String nameAttributeKey, OAuth2UserInfo oauth2UserInfo) {
        this.nameAttributeKey = nameAttributeKey;
        this.oauth2UserInfo = oauth2UserInfo;
    }

    /**
     * AuthProvider에 맞는 메소드 호출하여 OAuthAttributes 객체 반환
     * 파라미터 : userNameAttributeName -> OAuth2 로그인 시 키(PK)가 되는 값 / attributes : OAuth 서비스의 유저 정보들
     * 소셜별 of 메소드(ofGoogle)들은 각각 소셜 로그인 API에서 제공하는
     * 회원의 식별값(id), attributes, nameAttributeKey를 저장 후 build
     */
    public static OAuthAttributes of(AuthProvider provider,
                                     String userNameAttributeName, Map<String, Object> attributes) {

//        if (provider == AuthProvider.MATTERMOST) {
//            return ofMattermost(userNameAttributeName, attributes);
//        }
        return ofGoogle(userNameAttributeName, attributes);
    }

    public static OAuthAttributes ofGoogle(String userNameAttributeName, Map<String, Object> attributes) {
        return OAuthAttributes.builder()
            .nameAttributeKey(userNameAttributeName)
            .oauth2UserInfo(new GoogleOAuth2UserInfo(attributes))
            .build();
    }

    /**
     * of메소드로 OAuthAttributes 객체가 생성되어, 유저 정보들이 담긴 OAuth2UserInfo가 소셜 타입별로 주입된 상태
     * OAuth2UserInfo에서 providerUserId(식별값), email, name 가져와서 build
     * 최초 로그인 사용자는 추가 정보 입력 전 상태로 간주하여 GUEST로 설정
     */
    public Users toEntity(AuthProvider provider, OAuth2UserInfo oauth2UserInfo) {
        return Users.builder()
            .provider(provider)
            .providerUserId(oauth2UserInfo.getId())
            .email(oauth2UserInfo.getEmail())
            .oauthName(oauth2UserInfo.getName())
            .role(UserRole.GUEST)
            .build();
    }
}
