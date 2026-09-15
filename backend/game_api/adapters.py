import requests
from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.utils import generate_unique_username
from django.conf import settings
from django.core.files.base import ContentFile

class AccountAdapter(DefaultAccountAdapter):
	def get_reset_password_from_key_url(self, key: str) -> str:
		return f"{settings.FRONTEND_URL}/reset-password/{key}/"
	def get_email_confirmation_url(self, request, emailconfirmation) -> str:
		return f"{settings.FRONTEND_URL}/confirm-email/{emailconfirmation.key}/"
	def get_login_redirect_url(self, request) -> str:
		return f"{settings.FRONTEND_URL}/oauth/callback"
	def get_signup_redirect_url(self, request) -> str:
		# A new Google/42 account (first-ever login) goes through allauth's
		# signup redirect instead of the login one — same destination either way.
		return f"{settings.FRONTEND_URL}/oauth/callback"

class SocialAccountAdapter(DefaultSocialAccountAdapter):
	def populate_user(self, request, sociallogin, data):
		# Google/42 don't ask for a username during signup, so one from
		# whatever the provider gave us and let
		# allauth append a numeric suffix if that name is already taken.
		user = super().populate_user(request, sociallogin, data)
		candidates = [
			data.get("username"),
			user.first_name,
			user.last_name,
			user.email,
			"user",
		]
		user.username = generate_unique_username(candidates)
		return user

	def save_user(self, request, sociallogin, form=None):
		# Only runs on first-time signup (allauth calls save_user, not
		# populate_user, when linking a provider to an already-existing user),
		# so a returning user's avatar is never silently overwritten.
		user = super().save_user(request, sociallogin, form)
		avatar_url = sociallogin.account.get_avatar_url()
		if avatar_url and not user.avatar:
			try:
				resp = requests.get(avatar_url, timeout=5)
				resp.raise_for_status()
				ext = avatar_url.split("?")[0].rsplit(".", 1)[-1].lower()
				if ext not in ("png", "jpg", "jpeg"):
					ext = "jpg"
				user.avatar.save(f"{user.public_id}.{ext}", ContentFile(resp.content), save=True)
			except requests.RequestException:
				pass
		return user