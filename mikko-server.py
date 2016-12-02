import sys
import os

from django.conf import settings
from django.conf.urls import url
from django.core.management import execute_from_command_line
from django import template
from django.views.generic.edit import FormView
from django import forms

from subprocess import Popen

settings.configure(
    DEBUG=True,
    SECRET_KEY="A-random-secret-key!",
    ROOT_URLCONF=sys.modules[__name__],
    ALLOWED_HOSTS=["*"],
    TEMPLATES=[{
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [os.path.join(os.path.dirname(os.path.realpath(__file__)), "templates")],
    }],
    INSTALLED_APPS=["bootstrapform"],
)


VOICE_OPTIONS = [
    "mikko",
    "milla",
    "marko",
    "alan",
]

# Templatetags :D
register = template.Library()
@register.filter(name='css_funcs')
def add_css_class(field, css):
    return field.as_widget(attrs={"class":css})


class SubmitForm(forms.Form):
    voice = forms.ChoiceField(
        choices=[(voice, voice) for voice in VOICE_OPTIONS]
    )
    text = forms.CharField(required=True)


class IndexView(FormView):
    template_name = "submit_form.html"
    form_class = SubmitForm
    success_url = "/"

    def launch_mikko(self, text, voice):
        Popen(
            "python mikko.py %(text)s --%(voice)s" % {
                "text": text,
                "voice": voice
            },
            shell=True,
            close_fds=True
        )

    def form_valid(self, form):
        self.launch_mikko(
            text=form.cleaned_data["text"],
            voice=form.cleaned_data["voice"],
        )
        return super(IndexView, self).form_valid(form)

urlpatterns = [
    url(r"^$", IndexView.as_view()),
]

if __name__ == "__main__":
    execute_from_command_line(sys.argv)
