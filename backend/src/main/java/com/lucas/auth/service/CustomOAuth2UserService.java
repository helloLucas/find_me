package com.lucas.auth.service;

import com.lucas.auth.entity.AuthProvider;
import com.lucas.auth.oauth.OAuthAttributes;
import com.lucas.auth.principal.CustomOAuth2User;
import com.lucas.user.entity.User;
import com.lucas.user.repository.UserRepository;
import java.util.Collections;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

/** OAuth2 로그인의 로직을 담당 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {
    private final UserRepository userRepository;

    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        log.info("CustomOAuth2UserService.loadUser() 실행 - OAuth2 로그인 요청 진입");

        /**
         * DefaultOAuth2UserService 객체를 생성하여, loadUser(userRequest)를 통해 DefaultOAuth2User 객체를 생성 후
         * 반환 DefaultOAuth2UserService의 loadUser()는 소셜 로그인 API의 사용자 정보 제공 URI로 요청을 보내서 사용자 정보를 얻은 후,
         * 이를 통해 DefaultOAuth2User 객체를 생성 후 반환한다. 결과적으로, OAuth2User는 OAuth 서비스에서 가져온 유저 정보를 담고 있는 유저
         */
        OAuth2UserService<OAuth2UserRequest, OAuth2User> delegate = new DefaultOAuth2UserService();
        OAuth2User oAuth2User = delegate.loadUser(userRequest);

        /**
         * userRequest에서 registrationId 추출 후 registrationId로 AuthProvider 저장 userNameAttributeName은
         * 이후에 nameAttributeKey로 설정된다.
         */
        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        AuthProvider provider = getAuthProvider(registrationId);
        String userNameAttributeName =
                userRequest
                        .getClientRegistration()
                        .getProviderDetails()
                        .getUserInfoEndpoint()
                        .getUserNameAttributeName(); // OAuth2 로그인 시 키(PK)가 되는 값
        Map<String, Object> attributes =
                oAuth2User.getAttributes(); // 소셜 로그인에서 API가 제공하는 userInfo의 Json 값

        // provider에 따라 유저 정보를 통해 OAuthAttributes 객체 생성
        OAuthAttributes extractAttributes =
                OAuthAttributes.of(provider, userNameAttributeName, attributes);

        User createdUser = getUser(extractAttributes, provider); // getUser() 메소드로 User 객체 생성 후 반환

        // DefaultOAuth2User를 구현한 CustomOAuth2User 객체를 생성해서 반환
        return new CustomOAuth2User(
                Collections.singleton(new SimpleGrantedAuthority(createdUser.getRole().getKey())),
                attributes,
                extractAttributes.getNameAttributeKey(),
                createdUser.getId(),
                createdUser.getEmail(),
                createdUser.getNickname(),
                createdUser.getProvider(),
                createdUser.getProviderUserId(),
                createdUser.getRole());
    }

    private AuthProvider getAuthProvider(String registrationId) {
        if ("google".equalsIgnoreCase(registrationId)) {
            return AuthProvider.GOOGLE;
        }
        throw new OAuth2AuthenticationException("지원하지 않는 OAuth Provider 입니다: " + registrationId);
    }

    /**
     * AuthProvider와 attributes에 들어있는 소셜 로그인의 식별값 id를 통해 회원을 찾아 반환하는 메소드 만약 찾은 회원이 있다면, 그대로 반환하고 없다면
     * saveUser()를 호출하여 회원을 저장한다.
     */
    private User getUser(OAuthAttributes attributes, AuthProvider provider) {
        String providerUserId = attributes.getOauth2UserInfo().getId();

        return userRepository
                .findByProviderAndProviderUserId(provider, providerUserId)
                .map(
                        user -> {
                            log.info(
                                    "기존 회원 로그인 - provider={}, providerUserId={}, userId={}",
                                    provider,
                                    providerUserId,
                                    user.getId());
                            return user;
                        })
                .orElseGet(() -> saveUser(attributes, provider));
    }

    /**
     * OAuthAttributes의 toEntity() 메소드를 통해 빌더로 User 객체 생성 후 반환 생성된 User 객체를 DB에 저장 : provider,
     * providerUserId, email, role 값만 있는 상태
     */
    private User saveUser(OAuthAttributes attributes, AuthProvider provider) {
        User createdUser = attributes.toEntity(provider, attributes.getOauth2UserInfo());
        User savedUser = userRepository.save(createdUser);

        log.info(
                "신규 회원 저장 완료 - userId={}, provider={}, providerUserId={}, email={}, role={}",
                savedUser.getId(),
                savedUser.getProvider(),
                savedUser.getProviderUserId(),
                savedUser.getEmail(),
                savedUser.getRole());

        return savedUser;
    }
}
